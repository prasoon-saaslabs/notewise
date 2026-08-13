import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "./src/screens/HomeScreen";
import { RecordScreen } from "./src/screens/RecordScreen";
import { LibraryScreen } from "./src/screens/LibraryScreen";
import { JoinScreen } from "./src/screens/JoinScreen";

export type RootStackParamList = {
  Home: undefined;
  Record: undefined;
  Library: undefined;
  Join: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#f7f6f3" },
          headerTintColor: "#0c1222",
          contentStyle: { backgroundColor: "#f7f6f3" },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Notewise" }} />
        <Stack.Screen name="Record" component={RecordScreen} />
        <Stack.Screen name="Join" component={JoinScreen} options={{ title: "Join meeting" }} />
        <Stack.Screen name="Library" component={LibraryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
