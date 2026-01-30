---

title: puter.auth.getMonthlyUsage()

description: Get the user's current monthly resource usage in the Puter ecosystem.

platforms: \[websites, apps, nodejs, workers]

---



Get the user's current monthly resource usage in the Puter ecosystem.



<div class="info">



Usage data is scoped to the calling app only.



</div>



\## Syntax



```js

puter.auth.getMonthlyUsage()

```



\## Parameters



None



\## Return value



A `Promise` that resolves to a \[`MonthlyUsage`](/Objects/monthlyusage) object containing the user's monthly usage information.



\## Example



```html;auth-get-monthly-usage

<html>

&nbsp; <body>

&nbsp;   <script src="https://js.puter.com/v2/"></script>

&nbsp;   <script>

&nbsp;     puter.auth.getMonthlyUsage().then(function (usage) {

&nbsp;       puter.print(`<pre>${JSON.stringify(usage, null, 2)}</pre>`);

&nbsp;     });

&nbsp;   </script>

&nbsp; </body>

</html>



```





-----



---

title: MonthlyUsage

description: Object containing user's monthly resource usage information in the Puter ecosystem.

---



Object containing user's monthly resource usage information in the Puter ecosystem.



\## Attributes



\#### `allowanceInfo` (Object)



Information about the user's resource allowance and consumption.



\- `monthUsageAllowance` (Number) - Total resource allowance for the month.

\- `remaining` (Number) - The remaining allowance that can be used.



\#### `appTotals` (Object)



Total usage by application. Each key is an application id, and the value is an object with:



\- `count` (Number) - Number of Puter API calls per application.

\- `total` (Number) - Total resources consumed per application.



\#### `usage` (Object)



Usage information per API. Each key is an API name, and the value is an object with:



\- `cost` (Number) - Total resource consumed by this API.

\- `count` (Number) - Number of times the API is called.

\- `units` (Number) - Units of measurement for each API (e.g., tokens for AI calls, bytes for FS operations, etc).



<div class="info">



Resources in Puter are measured in microcents (e.g., $0.50 = 50,000,000).



</div>



