import { XlumeFormulaEngine } from "../src/index.js";
import { NodeFetchProvider } from "../src/providers/index.js";

// A concrete ExternalFunctionProvider that uses curl to fetch data synchronously.
// Requires curl to be available on the host system and outbound network access.
const provider = new NodeFetchProvider({ timeout: 15 });
const engine = new XlumeFormulaEngine(provider);

console.log("WEBSERVICE:", engine.evaluate('=WEBSERVICE("https://example.com")'));
console.log("TRANSLATE:", engine.evaluate('=TRANSLATE("hello","en","ja")'));
console.log("STOCKHISTORY:", engine.evaluate('=STOCKHISTORY("AAPL",45000,45030,0,1)'));
console.log("IMAGE:", engine.evaluate('=IMAGE("https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_92x30dp.png")'));
