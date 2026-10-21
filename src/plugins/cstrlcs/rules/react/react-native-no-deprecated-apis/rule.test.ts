import { RuleTester } from "oxlint/plugins-dev";

import { reactNativeNoDeprecatedApis } from "./rule.ts";

const LANGUAGE_OPTIONS = { parserOptions: { lang: "tsx" as const } };

function projectOf(name: string) {
  return { cwd: `${import.meta.dirname}/fixtures/${name}`, languageOptions: LANGUAGE_OPTIONS };
}

new RuleTester(projectOf("expo-56")).run(
  "react-native-no-deprecated-apis on Expo SDK 56",
  reactNativeNoDeprecatedApis,
  {
    invalid: [
      {
        code: `import { SafeAreaView, StyleSheet, Text } from "react-native";
const styles = StyleSheet.create({ overlay: { ...StyleSheet.absoluteFillObject, opacity: 0.5 } });`,
        errors: [{ messageId: "safeAreaView" }, { messageId: "absoluteFillObject" }],
        output: `import { SafeAreaView, StyleSheet, Text } from "react-native";
const styles = StyleSheet.create({ overlay: { ...StyleSheet.absoluteFill, opacity: 0.5 } });`,
      },
      {
        code: `import { SafeAreaView as Screen } from "react-native";
import { StyleSheet as Styles } from "react-native";
const backdrop = [Styles.absoluteFillObject, { zIndex: 1 }];`,
        errors: [{ messageId: "safeAreaView" }, { messageId: "absoluteFillObject" }],
        output: `import { SafeAreaView as Screen } from "react-native";
import { StyleSheet as Styles } from "react-native";
const backdrop = [Styles.absoluteFill, { zIndex: 1 }];`,
      },
      {
        code: `import Platform from "react-native/Libraries/Utilities/Platform";
export { default as flattenStyle } from "react-native/Libraries/StyleSheet/flattenStyle";
export * from "react-native/Libraries/Image/AssetRegistry";`,
        errors: [
          {
            data: { source: "react-native/Libraries/Utilities/Platform" },
            messageId: "deepImport",
          },
          {
            data: { source: "react-native/Libraries/StyleSheet/flattenStyle" },
            messageId: "deepImport",
          },
          {
            data: { source: "react-native/Libraries/Image/AssetRegistry" },
            messageId: "deepImport",
          },
        ],
      },
      {
        code: `import { Audio, Video } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MaterialIcons } from "@expo/vector-icons";`,
        errors: [
          { data: { source: "expo-av" }, messageId: "expoAv" },
          { data: { source: "@expo/vector-icons/Ionicons" }, messageId: "expoVectorIcons" },
          { data: { source: "@expo/vector-icons" }, messageId: "expoVectorIcons" },
        ],
      },
    ],
    valid: [
      `import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAudioPlayer } from "expo-audio";
import { Ionicons } from "@react-native-vector-icons/ionicons";
const styles = StyleSheet.create({ overlay: StyleSheet.absoluteFill });`,
      `const StyleSheet = { absoluteFillObject: {} };
const overlay = StyleSheet.absoluteFillObject;`,
      `import { StyleSheet } from "./styles.ts";
const overlay = StyleSheet.absoluteFillObject;`,
      `import { Platform } from "react-native";
import type { ViewProps } from "react-native";`,
    ],
  },
);

new RuleTester(projectOf("expo-54")).run(
  "react-native-no-deprecated-apis on Expo SDK 54",
  reactNativeNoDeprecatedApis,
  {
    invalid: [
      {
        code: `import { SafeAreaView } from "react-native";
import { Video } from "expo-av";
import Platform from "react-native/Libraries/Utilities/Platform";`,
        errors: [
          { messageId: "safeAreaView" },
          { messageId: "expoAv" },
          { messageId: "deepImport" },
        ],
      },
    ],
    valid: [
      `import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
const overlay = StyleSheet.absoluteFillObject;`,
    ],
  },
);

new RuleTester(projectOf("expo-52")).run(
  "react-native-no-deprecated-apis on Expo SDK 52",
  reactNativeNoDeprecatedApis,
  {
    invalid: [],
    valid: [
      `import { SafeAreaView, StyleSheet } from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import Platform from "react-native/Libraries/Utilities/Platform";
const overlay = StyleSheet.absoluteFillObject;`,
    ],
  },
);
