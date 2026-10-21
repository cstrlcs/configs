import type { Context, ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { memberName, unwrap } from "../shared/nodes.ts";
import { packageVersion } from "../shared/project.ts";
import { definitionOf } from "../shared/scope.ts";

const DEPRECATIONS = new Map([
  ["absoluteFillObject", { major: 0, minor: 82, name: "react-native" }],
  ["deepImport", { major: 0, minor: 80, name: "react-native" }],
  ["expoAv", { major: 53, minor: 0, name: "expo" }],
  ["expoVectorIcons", { major: 56, minor: 0, name: "expo" }],
  ["safeAreaView", { major: 0, minor: 81, name: "react-native" }],
]);

const DEPRECATED_MODULES = new Map([
  ["@expo/vector-icons", "expoVectorIcons"],
  ["expo-av", "expoAv"],
]);

function installedDeprecations(filename: string) {
  return new Set(
    [...DEPRECATIONS].flatMap(([messageId, { major, minor, name }]) => {
      const version = packageVersion(filename, name);

      if (
        version === undefined ||
        version.major < major ||
        (version.major === major && version.minor < minor)
      ) {
        return [];
      }

      return [messageId];
    }),
  );
}

function sourceDeprecation(source: string) {
  const [scope = "", name = ""] = source.split("/");

  if (scope === "react-native" && name === "Libraries") {
    return "deepImport";
  }

  return DEPRECATED_MODULES.get(scope.startsWith("@") ? `${scope}/${name}` : scope);
}

function importedName(specifier: ESTree.ImportDeclarationSpecifier) {
  if (specifier.type !== "ImportSpecifier") {
    return;
  }

  const { imported } = specifier;

  return imported.type === "Identifier" ? imported.name : imported.value;
}

function isNativeStyleSheet(context: Context, node: ESTree.Node) {
  const target = unwrap(node);
  const definition = target.type === "Identifier" ? definitionOf(context, target) : undefined;
  const declaration = definition?.parent;
  const specifier = definition?.node;

  return (
    declaration?.type === "ImportDeclaration" &&
    declaration.source.value === "react-native" &&
    specifier?.type === "ImportSpecifier" &&
    importedName(specifier) === "StyleSheet"
  );
}

export const reactNativeNoDeprecatedApis = defineRule({
  meta: {
    docs: {
      description:
        "Forbid React Native and Expo APIs that the installed versions deprecated or removed.",
    },
    fixable: "code",
    messages: {
      absoluteFillObject:
        '"StyleSheet.absoluteFillObject" is deprecated since React Native 0.82 and removed in 0.85. Use StyleSheet.absoluteFill instead.',
      deepImport:
        '"{{source}}" is a deep import into React Native internals, which React Native 0.80 deprecated. Import the API from react-native instead, or use a library that provides it.',
      expoAv:
        '"{{source}}" is deprecated since Expo SDK 53 and removed from SDK 55. Use expo-video for video and expo-audio for audio instead.',
      expoVectorIcons:
        '"{{source}}" is deprecated since Expo SDK 56. Install the @react-native-vector-icons package of each icon family, such as @react-native-vector-icons/ionicons, instead.',
      safeAreaView:
        '"SafeAreaView" from react-native is deprecated since React Native 0.81, because it only works on iOS and ignores Android edge-to-edge insets. Import SafeAreaView from react-native-safe-area-context instead.',
    },
    schema: [],
    type: "problem",
  },
  createOnce(context) {
    let deprecated = new Set<string>();

    function checkSource(source: ESTree.StringLiteral | null) {
      const messageId = source === null ? undefined : sourceDeprecation(source.value);

      if (source === null || messageId === undefined || !deprecated.has(messageId)) {
        return;
      }

      context.report({ data: { source: source.value }, messageId, node: source });
    }

    return {
      before() {
        deprecated = installedDeprecations(context.filename);

        return deprecated.size > 0;
      },
      ExportAllDeclaration(node) {
        checkSource(node.source);
      },
      ExportNamedDeclaration(node) {
        checkSource(node.source);
      },
      ImportDeclaration(node) {
        checkSource(node.source);

        if (node.source.value !== "react-native" || !deprecated.has("safeAreaView")) {
          return;
        }

        for (const specifier of node.specifiers) {
          if (importedName(specifier) === "SafeAreaView") {
            context.report({ messageId: "safeAreaView", node: specifier });
          }
        }
      },
      MemberExpression(node) {
        if (
          memberName(node) !== "absoluteFillObject" ||
          !deprecated.has("absoluteFillObject") ||
          !isNativeStyleSheet(context, node.object)
        ) {
          return;
        }

        context.report({
          fix: (fixer) => fixer.replaceText(node.property, "absoluteFill"),
          messageId: "absoluteFillObject",
          node,
        });
      },
    };
  },
});
