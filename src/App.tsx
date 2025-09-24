import "./App.css";
import ScalprumProvider from "@scalprum/react-core";
import Sandbox from "./components/Sandbox";
import RemoteHookProvider from "./RemoteHookProvider";

function App() {

	return (
		<ScalprumProvider pluginSDKOptions={{
			pluginLoaderOptions: {
				// transformPluginManifest
			}
		}} config={{
			'chrome': {
				name: 'chrome',
				manifestLocation: 'http://localhost:8080/manifest.json',
			}
		}}>
			<div className="App">
				<RemoteHookProvider>
					<Sandbox />
				</RemoteHookProvider>
			</div>
		</ScalprumProvider>
	);
}

export default App;
