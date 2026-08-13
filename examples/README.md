# xlume-formula external provider examples

`NodeFetchProvider` in `src/providers/node-fetch-provider.ts` is a concrete `ExternalFunctionProvider` that performs synchronous HTTP requests using `curl`. It enables the following worksheet functions out of the box:

- `WEBSERVICE(url)`
- `IMAGE(url)`
- `TRANSLATE(text, source_language, target_language)`
- `STOCKHISTORY(ticker, start_date, end_date, [interval], [headers])`

## Usage

```ts
import { XlumeFormulaEngine } from "xlume-formula";
import { NodeFetchProvider } from "xlume-formula/providers";

const engine = new XlumeFormulaEngine(new NodeFetchProvider({ timeout: 15 }));

engine.evaluate('=WEBSERVICE("https://example.com")');
engine.evaluate('=TRANSLATE("hello","en","ja")');
engine.evaluate('=STOCKHISTORY("AAPL",45000,45030,0,1)');
engine.evaluate('=IMAGE("https://example.com/logo.png")');
```

## Notes

- All network calls are synchronous and block the Node.js event loop. Use this only in offline scripts or with a cache-backed wrapper in production.
- `STOCKHISTORY` uses Yahoo Finance public chart endpoints and may be rate-limited. Pass a valid `User-Agent` if needed.
- `TRANSLATE` uses a public Google Translate endpoint for demonstration only and may change or be rate-limited.
