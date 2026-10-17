import type { Analysis, ClassList } from "./analysis.ts";
import type { ClassLiteral, ClassToken } from "./class-literals.ts";
import type { Finding } from "./finding.ts";
import type { Project } from "./project.ts";
import type { Context, Fixer, RuleMeta } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { createCollector, toClassLiteral } from "./class-literals.ts";
import { findProject } from "./project.ts";
import { analyzeSync } from "./worker.ts";

export interface TokenFinding<MessageId extends string = string> {
  data: Record<string, string>;
  messageId: MessageId;
  removes?: true;
  token: ClassToken;
}

interface Report {
  data: Record<string, string>;
  messageId: string;
  removes?: true;
  replacement?: string;
  tokens: ClassToken[];
}

interface FileAnalysis {
  analyses: Analysis[];
  filename: string;
  literals: ClassLiteral[];
  text: string;
}

type AnalysisKey = keyof Analysis;

type MessageIdOf<Key extends AnalysisKey> = Analysis[Key] extends Finding<infer MessageId>[]
  ? MessageId
  : never;

interface ClassRule<Key extends AnalysisKey, TokenMessageId extends string> {
  analysis?: Key;
  inspectTokens?: (literal: ClassLiteral) => TokenFinding<TokenMessageId>[];
  meta: RuleMeta & { messages: Record<NoInfer<MessageIdOf<Key> | TokenMessageId>, string> };
}

let cache: FileAnalysis | undefined;

function analyzeFile(context: Context, project: Project, literals: ClassLiteral[]) {
  const { physicalFilename: filename } = context;
  const { text } = context.sourceCode;

  if (cache?.filename === filename && cache.text === text) {
    return cache;
  }

  const lists = literals.map(
    ({ classes, group }) =>
      ({ classNames: classes.map((token) => token.value), group }) satisfies ClassList,
  );

  cache = { analyses: analyzeSync(project, lists), filename, literals, text };

  return cache;
}

function toReport(literal: ClassLiteral, { classNames, ...finding }: Finding) {
  const tokens = classNames.flatMap(
    (className) => literal.classes.find((token) => token.value === className) ?? [],
  );

  return { ...finding, tokens } satisfies Report;
}

function fixReport({ removes, replacement, tokens }: Report, fixer: Fixer) {
  const [first, ...rest] = tokens;

  if (first !== undefined && replacement !== undefined) {
    return [
      fixer.replaceTextRange(first.range, replacement),
      ...rest.map((token) => fixer.removeRange(token.removal)),
    ];
  }

  if (removes === undefined) {
    return null;
  }

  return tokens.map((token) => fixer.removeRange(token.removal));
}

function reportFinding(context: Context, report: Report) {
  const [node] = report.tokens;

  if (node === undefined) {
    return;
  }

  context.report({
    data: report.data,
    fix: (fixer) => fixReport(report, fixer),
    messageId: report.messageId,
    node,
  });
}

function findingsOf(analysis: Analysis | undefined, key: AnalysisKey | undefined) {
  const findings: Finding[] = key === undefined ? [] : (analysis?.[key] ?? []);

  return findings;
}

function reportFile<Key extends AnalysisKey, TokenMessageId extends string>(
  context: Context,
  { analyses, literals }: Pick<FileAnalysis, "analyses" | "literals">,
  { analysis, inspectTokens }: ClassRule<Key, TokenMessageId>,
) {
  for (const [index, literal] of literals.entries()) {
    for (const finding of findingsOf(analyses[index], analysis)) {
      reportFinding(context, toReport(literal, finding));
    }

    for (const { token, ...finding } of inspectTokens?.(literal) ?? []) {
      reportFinding(context, { ...finding, tokens: [token] });
    }
  }
}

export function defineClassRule<
  Key extends AnalysisKey = never,
  TokenMessageId extends string = never,
>(rule: ClassRule<Key, TokenMessageId>) {
  return defineRule({
    meta: { ...rule.meta, schema: [] },
    createOnce(context) {
      let literals: ClassLiteral[] = [];
      let project: Project | undefined;
      let group = 0;

      return {
        before() {
          literals = [];
          group = 0;
          project = findProject(context.physicalFilename);

          return project !== undefined;
        },
        ...createCollector((nodes) => {
          group += 1;

          literals.push(
            ...nodes.map((node) => toClassLiteral(node, context.sourceCode.text, group)),
          );
        }),
        "Program:exit"() {
          if (project === undefined || literals.length === 0) {
            return;
          }

          const file =
            rule.analysis === undefined
              ? { analyses: [], literals }
              : analyzeFile(context, project, literals);

          reportFile(context, file, rule);
        },
      };
    },
  });
}
