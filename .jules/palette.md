## 2024-05-14 - Initial setup
**Learning:** Found an app using SAP UI5. Will focus on a11y improvements or interaction improvements.
**Action:** Investigate the existing views for potential UI/UX/A11y improvements.

## 2024-05-14 - Button Accessibiliy Check
**Learning:** Found `<Button>` tags in `AdvancedFilterDialog.fragment.xml` with text like `Cancel` that lack aria-label. However, UI5 usually infers `aria-label` from `text`. But icon-only buttons need `tooltip` or `aria-label`. Looking at `Logs.view.xml`: `btnViewSettings` has tooltip, `refresh` has tooltip, `copy` has tooltip. So icon-only buttons generally have tooltips. Let's check inputs for `ariaLabelledBy` or `ariaDescribedBy` or `tooltip`.

**Action:** Looking deeper into `AdvancedFilterDialog.fragment.xml` input elements and labels.

## 2024-05-14 - Advanced Filter Dialog Check
**Learning:** Found inputs within a table column list item (`AdvancedFilterDialog.fragment.xml`). There's `ComboBox` for column, `ComboBox` for operator, and `Input` for value. These components don't have explicit labels using `ariaLabelledBy` pointing to column headers. However, setting tooltips to localized text is already present. This is a reasonable pattern. Wait, what about `SettingsDialog.fragment.xml`? It has `Label` but `<Select>` lacks `ariaLabelledBy`. Wait, `<Label text="..." labelFor="modelSelect" />` exists, which automatically creates the association in SAP UI5.

Let's check the empty states or loading states.
In `Logs.view.xml`: `searchField` is missing `ariaLabelledBy` or an explicit label. Let's check:
```xml
<SearchField
    id="searchField"
    width="auto"
    search=".onSearch"
    liveChange=".onSearch"
    placeholder="{i18n>searchPlaceholder}"
    tooltip="{i18n>searchPlaceholder}"
    maxLength="200">
```
Is there a way to add an ARIA label? UI5 automatically applies an ARIA label to `SearchField` (it natively uses aria-label internally based on the placeholder or tooltip usually).

Let's look at missing tooltips for buttons.
```xml
<Button text="Save" press=".onSaveSettings" type="Emphasized" />
<Button text="Cancel" press=".onCancelSettings" />
```
Wait, text-based buttons don't necessarily need tooltips unless the text is ambiguous.

Let's check `Dashboard.view.xml` tiles:
```xml
			<GenericTile
				class="sapUiTinyMarginBegin sapUiTinyMarginTop"
				header="{i18n>totalQueries}"
				subheader="{i18n>last24Hours}"
				press=".onPressLogs"
				tooltip="{i18n>viewQueryLog}">
```
They have tooltips.

Let's check `Login.view.xml`.
```xml
<Input id="usernameInput" value="{/username}" required="true" placeholder="Enter your username" submit=".onLoginPress" liveChange=".onInputChange" maxLength="50" />
```
It has `labelFor="usernameInput"` on its `<Label>`, which is good.

Is there any missing `ariaDescribedBy` for the password input in `Login.view.xml`? "Enter your password" is the placeholder. It does not have helper text.

What about `<TextArea>` in Settings?
```xml
<Label text="System Context (Optional)" labelFor="contextInput" class="sapUiSmallMarginTop"/>
<TextArea id="contextInput" .../>
```
It has `labelFor` association.

Let's check `Table` accessibility. In `Dashboard.view.xml`:
```xml
<Table ariaLabelledBy="cardHeaderClients" items="{/top_clients}" inset="false" fixedLayout="true" class="sapUiSizeCompact" alternateRowColors="true" noDataText="{i18n>noActiveClients}">
```
They have `ariaLabelledBy`, which is excellent.

Let's check `Logs.view.xml` table:
```xml
				<Table
					id="logsTable"
					ariaLabelledBy="logsTableTitle"
```
Also excellent.

Wait, are there any images that need `alt` attributes?
In `Logs.view.xml`:
```xml
								<core:Icon src="sap-icon://database"
									color="Positive"
									visible="{= ${reason}.indexOf('served from cache') > -1 || ${reason} === 'Rewrite' }"
									tooltip="{reason}"
									decorative="false"
									alt="{reason}" />
```
```xml
								<core:Icon src="sap-icon://decline" color="Negative" visible="{= ${blocked} === true }" tooltip="{i18n>requestBlocked}" alt="{i18n>requestBlocked}" decorative="false" />
```
Very good.

Let's look for UX interaction improvements.
What happens when there's an empty state in the Dashboard? The Tables say `noDataText="{i18n>noActiveClients}"`. Is there an IllustratedMessage we can use for empty states in Tables? UI5 `Table` supports an `IllustratedMessage` in the `<noData>` aggregation.

Wait, in `Dashboard.view.xml`:
```xml
                            <Table ariaLabelledBy="cardHeaderClients" items="{/top_clients}" inset="false" fixedLayout="true" class="sapUiSizeCompact" alternateRowColors="true" noDataText="{i18n>noActiveClients}">
```
Using `noDataText` displays a plain text message. A much better UX is to use an IllustratedMessage as done in `Logs.view.xml`:
```xml
					<noData>
						<IllustratedMessage illustrationType="sapIllus-NoSearchResults" title="{i18n>noLogsFoundTitle}" description="{i18n>noLogsFoundDescription}" />
					</noData>
```
But `Dashboard` tables are inside small Cards, so a full `IllustratedMessage` might be too large. It defaults to a smaller size though.
Wait, `sap.m.Table` `noData` is a common aggregation. Maybe we leave `noDataText` for cards because cards are small.

Is there any missing Loading states?
`Dashboard.controller.ts` calls `this.getView()?.setBusy(true);` when refreshing, which overlays the whole view with a busy indicator.

Wait, in `Dashboard.view.xml` header Toolbar:
```xml
				<Button icon="sap-icon://refresh" type="Transparent" press=".onManualRefresh" tooltip="{i18n>refreshData}" class="sapUiTinyMarginBegin" />
```
Wait, the "Settings" and "Logout" buttons in the footer do not have text, only icons and tooltips.
```xml
				<Button icon="sap-icon://action-settings" tooltip="{i18n>settings}" press=".onOpenSettings" />
                <Button icon="sap-icon://log" tooltip="{i18n>logout}" press=".onLogoutPress" />
```
That's okay as they have tooltips.

What about `Logs.view.xml` toolbar?
```xml
							<Button id="btnViewSettings" icon="sap-icon://sort" press=".onOpenViewSettings" tooltip="{i18n>sortFilter}"/>
							<Button icon="sap-icon://refresh" press=".onRefreshLogs" tooltip="{i18n>refresh}"/>
							<Button icon="sap-icon://copy" press=".onCopyAllLogs" tooltip="{parts:[{path:'i18n>copyAll'}, {path:'/data', formatter: '.formatter.getLength'}], formatter: '.formatter.formatMessage'}"/>
```
These are icon-only buttons with tooltips.

Let's examine `Login.view.xml`.
Is there a visual loading state for the login button?
`Login.controller.ts` uses `this.getView()?.setBusy(true);` which shows a full page overlay. It would be nicer to just have the button show a busy state, but full page is standard SAP UI5.

Wait! The login form does not support "Enter" key on the whole panel, but it has `submit=".onLoginPress"` on both `<Input>` fields, which is correct for keyboard accessibility.

Let's look at missing form validation feedback or tooltips.
In `AdvancedFilterDialog.fragment.xml`, the text says:
```xml
						<Title id="advancedFilterTitle" text="Conditions ({= ${view>/advancedFilters} ? ${view>/advancedFilters}.length : 0 })" level="H4"/>
```
And empty state of the filter table? It shows columns.
Is there an "Empty state with helpful guidance" in the Advanced Filter dialog when there are no conditions?
```xml
			<Table
				id="filterTable"
				ariaLabelledBy="advancedFilterTitle"
				items="{view>/advancedFilters}"
				mode="None"
				growing="false"
				width="100%">
```
It could have an empty state like "No conditions added. Click 'Add Condition' to start."
That's a nice micro UX improvement!

Let's check what it currently shows when empty. It probably just shows "No data" because it uses the default `noDataText`.
Let's add a nice `IllustratedMessage` or informative `noData` aggregation to the Advanced Filter Table.
```xml
<noData>
    <IllustratedMessage illustrationType="sapIllus-EmptyList" title="No Filter Conditions" description="Click 'Add Condition' to refine your search." />
</noData>
```
Wait, let's see what `i18n.properties` has.

Let's look closely at `webapp/view/fragment/AdvancedFilterDialog.fragment.xml`.
Is there a way to add an empty state for the advanced filters? Yes, in `webapp/view/fragment/AdvancedFilterDialog.fragment.xml`.
Currently, the Table looks like:
```xml
			<Table
				id="filterTable"
				ariaLabelledBy="advancedFilterTitle"
				items="{view>/advancedFilters}"
				mode="None"
				growing="false"
				width="100%">
```
When there are no filters, the user sees an empty table with just the headers and a default text. A better UX is to add a `noData` aggregation.
I need to add localization for empty state. Is this too much? It's < 50 lines.

What else? Look at `webapp/view/fragment/SettingsDialog.fragment.xml`.
There's an Input for API Key:
```xml
				<Label text="Gemini API Key" labelFor="apiKeyInput" class="sapUiSmallMarginTop"/>
				<Input
					id="apiKeyInput"
					value="{/apiKey}"
					placeholder="Enter your Gemini API Key"
					type="Password"
					showValueHelp="true"
					valueHelpIconSrc="sap-icon://show"
					valueHelpRequest=".onToggleApiKeyVisibility"
					width="100%"
					maxLength="100"
					ariaDescribedBy="apiKeyHelpText" />
				<Text id="apiKeyHelpText" text="Your API key is stored locally in your browser." class="sapUiTinyMarginTop" />
                <Link text="Get an API Key" href="https://aistudio.google.com/app/apikey" target="_blank" class="sapUiSmallMarginBottom" />
```
This is pretty good UX already! (Value help toggles password visibility).

What about `Login.view.xml`?
It also has a toggle password visibility.
Wait, is there any input validation feedback missing?
In `webapp/controller/SettingsDialog.ts` (or `BaseController` for settings):
```typescript
    public onSaveSettings(): void {
        const view = this.getView();
        if (!view) return;
        const model = view.getModel() as JSONModel;
        const apiKey = model.getProperty("/apiKey") as string;
        const selectedModel = model.getProperty("/selectedModel") as string;
        const baseUrl = model.getProperty("/baseUrl") as string;
```
Does it validate `baseUrl`?
In `SettingsService.ts`, let's check.

Let's do this:
In `webapp/view/fragment/AdvancedFilterDialog.fragment.xml`, the `Table` element for the advanced filter conditions lacks an empty state. Adding an `IllustratedMessage` when there are no filters improves the UX by guiding the user to add a condition.
But wait! Let's check what `IllustratedMessage` says when we use standard `sapIllus-EmptyList`.

```xml
<Table
    id="filterTable"
    ... >
    <noData>
        <IllustratedMessage illustrationType="sapIllus-EmptyList" title="{i18n>noFilterConditions}" description="{i18n>noFilterConditionsDesc}" />
    </noData>
```

Let's check if the table currently has a default `noData` text. It doesn't have `noDataText` attribute, so it defaults to "No data".
Let's add `noDataText="{i18n>noFilterConditions}"` to it if we don't want a huge illustration, or we can use `IllustratedMessage`.
Wait, the table is inside a Dialog. A big illustration might look good since it's an empty state.

Wait, what about `Logs.view.xml`? It uses:
```xml
					<noData>
						<IllustratedMessage illustrationType="sapIllus-NoSearchResults" title="{i18n>noLogsFoundTitle}" description="{i18n>noLogsFoundDescription}" />
					</noData>
```
So it's consistent.

Let's look at `webapp/i18n/i18n.properties`.
```properties
advancedFilter=Advanced Filter
```
I will add:
```properties
noFilterConditions=No Filter Conditions
noFilterConditionsDesc=Click 'Add Condition' to refine your search.
```
This is a solid micro UX improvement! It provides clear empty-state guidance.

Wait, another simple UX touch: the "Password" input in the Settings dialog has:
```xml
				<Input
					id="apiKeyInput"
					value="{/apiKey}"
					placeholder="Enter your Gemini API Key"
					type="Password"
					showValueHelp="true"
					valueHelpIconSrc="sap-icon://show"
```
Wait, wait. "showValueHelp" is used to toggle password visibility. This is a bit of a hack in UI5 (using `valueHelpRequest` instead of a native password toggle, although `Input` type `Password` doesn't have a native toggle in older UI5, it's common).

What about tooltips for icon-only buttons?
In `AdvancedFilterDialog.fragment.xml`:
```xml
<Button icon="sap-icon://delete" type="Transparent" press=".onRemoveFilterRow" tooltip="{i18n>removeCondition}" />
```
It has a tooltip. Good.

In `Dashboard.view.xml`:
```xml
<Button icon="sap-icon://copy" type="Transparent" press=".onCopyAllClients" tooltip="{parts:[{path:'i18n>copyAllClients'}, {path:'/top_clients', formatter: '.formatter.getLength'}], formatter: '.formatter.formatMessage'}" class="floatingCopyBtn" />
```
It has a tooltip.

In `Logs.view.xml`:
```xml
<Button id="btnFilter" icon="sap-icon://filter" press=".onOpenAdvancedFilter" tooltip="{i18n>advancedFilter}">
```
Has tooltip.

Is there any `Table` in `Dashboard.view.xml` that uses `noDataText`? Yes.
```xml
<Table ariaLabelledBy="cardHeaderClients" items="{/top_clients}" inset="false" fixedLayout="true" class="sapUiSizeCompact" alternateRowColors="true" noDataText="{i18n>noActiveClients}">
```
This is fine for small cards.

Wait, are there any loading spinners for asynchronous actions that don't have them?
In `Logs.controller.ts`, `onAnalyzeLogs` does:
```typescript
view.setBusy(true);
```
which blocks the whole screen. It would be better to just set the button to busy, but `setBusy(true)` is standard.

Let's check `Login.controller.ts`.

Let's do this one micro UX improvement:
The "Smart Analysis" dialog doesn't have an empty state if `analysisHtml` is empty or loading.
Wait, `Logs.controller.ts` sets view to busy until analysis is complete, then opens the dialog.
There is a "Smart Analysis" icon-only button without label? No, `text="{i18n>smartAnalysis}"`.

Let's look at `webapp/view/fragment/AdvancedFilterDialog.fragment.xml`.
I will add an `IllustratedMessage` to it to provide better guidance to the user when no filters are set.
Currently it's an empty Table.

```xml
				<noData>
					<IllustratedMessage illustrationType="sapIllus-EmptyList" title="{i18n>noFilterConditions}" description="{i18n>noFilterConditionsDesc}" />
				</noData>
```

Wait, `i18n.properties` needs updating for all languages or just english?
Let's see the languages.
`webapp/i18n/i18n.properties`
`webapp/i18n/i18n_en.properties`
`webapp/i18n/i18n_de.properties`
`webapp/i18n/i18n_tr.properties`

It's a tiny, elegant UX addition for the empty state. It makes the application much friendlier!

Another small UX win:
In `Dashboard.view.xml`, "Top Clients" card `Table` is using `noDataText="{i18n>noActiveClients}"`.
What if we use an IllustratedMessage for the Cards? The `Table` component inside a card might be too small for the default IllustratedMessage. But UI5 scales it down if needed.
Actually, `noDataText` is better for compact cards because there is not much height.

Another possibility:
Is the API Key password input lacking a tooltip for the "eye" icon?
```xml
					showValueHelp="true"
					valueHelpIconSrc="sap-icon://show"
					valueHelpRequest=".onToggleApiKeyVisibility"
```
The "eye" icon is a standard UI5 Value Help icon re-purposed here.

Let's look at the `ViewSettingsDialog` which doesn't exist? Wait, `Logs.controller.ts` uses `Constants.Fragments.ViewSettingsDialog`. Let's check where it is.

Ah! `webapp/view/ViewSettingsDialog.fragment.xml` is actually named that, let me verify.

`ls webapp/view/`
It does contain `ViewSettingsDialog.fragment.xml`! Wait, I listed it earlier and saw it in `webapp/view/` instead of `webapp/view/fragment/`.
Let me read `webapp/view/ViewSettingsDialog.fragment.xml`.

Let's do this UX improvement.
The password inputs use `<Input type="Password" showValueHelp="true" valueHelpIconSrc="sap-icon://show" valueHelpRequest=".onToggleApiKeyVisibility" ... />`
This uses `valueHelpIconSrc`. But it does not have an ARIA label for that specific icon, although `Input` itself has one. The issue with `showValueHelp` is it's meant for displaying a dialog to select values, not a toggle. However, we can't easily add a tooltip to the value help icon directly.

What about empty state on the AdvancedFilter dialog? Yes, that's exactly what I should do.
Let's see if there are missing `placeholder` attributes on inputs.
`Login.view.xml`: "Enter your username", "Enter your password". Good.
`SettingsDialog.fragment.xml`: "e.g. http://192...", "Enter your Gemini API Key", "Describe your network...". Good.
`AdvancedFilterDialog.fragment.xml`:
`<Input tooltip="{i18n>value}" value="{view>value}" width="100%" placeholder="{i18n>value}" submit=".onConfirmAdvancedFilter" maxLength="200" />`
Wait, does this refer to the value entered inside the Table items? Yes.

I'll add the empty state illustration to `AdvancedFilterDialog`.
Wait, is there anything else I can improve?
"Dashboard" empty cards!
`Dashboard.view.xml`:
```xml
                            <Table ariaLabelledBy="cardHeaderClients" items="{/top_clients}" inset="false" fixedLayout="true" class="sapUiSizeCompact" alternateRowColors="true" noDataText="{i18n>noActiveClients}">
```
UI5 provides a `sapIllus-EmptyList` for empty states which provides a much better experience than simple text. However, doing this for all 4 tables inside the grid cards will look repetitive if all 4 are empty.

Wait, the `Login.view.xml` Password input:
```xml
<Label text="Password" labelFor="passwordInput" class="sapUiSmallMarginTop" required="true"/>
<Input id="passwordInput" value="{/password}" required="true" type="Password" placeholder="Enter your password" submit=".onLoginPress" liveChange=".onInputChange" maxLength="100" showValueHelp="true" valueHelpIconSrc="sap-icon://show" valueHelpRequest=".onShowPassword" />
```

Wait, `Login.controller.ts` does:
```typescript
        if (input.getType() === InputType.Password) {
            input.setType(InputType.Text);
            input.setValueHelpIconSrc("sap-icon://hide");
        } else {
            input.setType(InputType.Password);
            input.setValueHelpIconSrc("sap-icon://show");
        }
```
Does it update the tooltip of the valueHelp icon? No. The user just sees an eye icon. If we set `valueHelpIconSrc="sap-icon://show"`, it's just a visual icon. But we can't set a tooltip on the valueHelp icon specifically.
If we want to make it accessible, we would need to use `ariaDescribedBy` or something on the input. But `Input` has native `aria-label` based on `labelFor`.

What about adding a "Clear All" confirmation?
In `AdvancedFilterDialog`, `onClearAdvancedFilters` clears it instantly. It might be better to show a confirmation dialog or a toast. Wait, "Clear All" just clears the UI, then `onConfirmAdvancedFilter` isn't called unless they press Apply? No!
In `Logs.controller.ts`:
```typescript
	public onClearAdvancedFilters(): void {
		const viewModel = this.getViewModel("view");
		if (!viewModel) return;
		viewModel.setProperty(Constants.ModelProperties.AdvancedFilters, []);
		this._applyFilters();
	}
```
It immediately applies the clear, bypassing the "Apply" step. So if a user clicks "Clear All" they might accidentally lose their advanced filters. But `Advanced Filters` are usually temporary anyway.

What if we add a character counter to the Search field?
`SearchField` natively shows a clear icon when text is typed.

Let's look at `Dashboard.view.xml`:
```xml
				<Button icon="sap-icon://action-settings" tooltip="{i18n>settings}" press=".onOpenSettings" />
                <Button icon="sap-icon://log" tooltip="{i18n>logout}" press=".onLogoutPress" />
```
These are icon-only buttons. They have tooltips, but what about `aria-label`?
Actually, in UI5, `tooltip` on a `Button` without `text` automatically sets the `aria-label` property! So it's fully accessible. This is a known UI5 feature.

Wait! I see in memory:
`In SAPUI5, aria-label is not a valid native property for standard controls like sap.m.ComboBox and sap.m.Input in XML views. Instead, use ariaLabelledBy (referencing a visible label or sap.ui.core.InvisibleText), tooltip, or placeholder to ensure screen reader accessibility.`
`In SAP UI5, for icon-only buttons (like sap.m.Button), using the tooltip property mapped to an i18n key is the preferred pattern and provides sufficient accessible naming for screen readers, eliminating the need for redundant ariaLabelledBy or aria-label attributes.`

Okay, so the tooltips on buttons are already perfect for A11y.
Wait, let's read another memory:
`In SAP UI5 applications, visually associated helper <Text> tags near <Input> components are ignored by screen readers unless explicitly linked. Use the ariaDescribedBy attribute on the <Input> referencing the id of the descriptive <Text> element to ensure full accessibility.`

Let's check `Login.view.xml` and see if any helper texts are missing `ariaDescribedBy` links.
In `Login.view.xml`:
```xml
                            <Label text="Username" labelFor="usernameInput" required="true"/>
                            <Input id="usernameInput" value="{/username}" required="true" placeholder="Enter your username" submit=".onLoginPress" liveChange=".onInputChange" maxLength="50" />
```
No helper text there.

Let's check `SettingsDialog.fragment.xml`:
```xml
				<Input
					id="baseUrlInput"
					value="{/baseUrl}"
					placeholder="e.g. http://192.168.1.50 or http://192.168.1.50/agh"
					width="100%"
					ariaDescribedBy="baseUrlHelpText" />
				<Text id="baseUrlHelpText" text="Leave empty to use relative path (Proxy Mode)." class="sapUiTinyMarginBottom" />
```
It uses `ariaDescribedBy="baseUrlHelpText"`. Good.
```xml
				<Input
					id="apiKeyInput"
					value="{/apiKey}"
					placeholder="Enter your Gemini API Key"
					type="Password"
					...
					ariaDescribedBy="apiKeyHelpText" />
				<Text id="apiKeyHelpText" text="Your API key is stored locally in your browser." class="sapUiTinyMarginTop" />
```
Good!

Let's check `AdvancedFilterDialog.fragment.xml`:
```xml
							<ComboBox tooltip="{i18n>column}" selectedKey="{view>column}" width="100%">
```
It has `tooltip`, which acts as the accessible name. But it doesn't have an explicit label.

Wait! What about the `ariaLabelledBy` in Table nested inside Card?
`In SAP UI5 applications, Tables nested inside Cards (sap.f.Card) do not automatically inherit the Card's header as their accessible label. Explicitly set an id on the card:Header and reference it using ariaLabelledBy on the Table to fix this.`
Let's check `Dashboard.view.xml` to see if they fixed it:
```xml
                    <f:header>
                        <card:Header id="cardHeaderClients" title="{i18n>topClients}" iconSrc="sap-icon://group" />
                    </f:header>
...
                            <Table ariaLabelledBy="cardHeaderClients" items="{/top_clients}" inset="false" fixedLayout="true" class="sapUiSizeCompact" alternateRowColors="true" noDataText="{i18n>noActiveClients}">
```
Yes, they did!

Let's find something missing!
What about `ariaLabelledBy` on `Logs.view.xml` Table?
```xml
				<Table
					id="logsTable"
					ariaLabelledBy="logsTableTitle"
...
							<Title id="logsTableTitle" text="{i18n>logsHeader}" level="H2"/>
```
Yes, they did!

Let's check `AdvancedFilterDialog.fragment.xml` Table:
```xml
			<Table
				id="filterTable"
				ariaLabelledBy="advancedFilterTitle"
```
Yes, they did!

Wait, is there any image that doesn't have `alt` text?
In `Logs.view.xml`:
```xml
								<core:Icon src="sap-icon://database"
...
									alt="{reason}" />
```
Wait, wait! Let's check `Logs.view.xml` SearchField.
```xml
							<SearchField
								id="searchField"
...
								placeholder="{i18n>searchPlaceholder}"
								tooltip="{i18n>searchPlaceholder}"
								maxLength="200">
```
It has placeholder and tooltip, which is sufficient.

Let's look at UX interactions. In `Dashboard.view.xml`:
```xml
			<GenericTile
				class="sapUiTinyMarginBegin sapUiTinyMarginTop"
				header="{i18n>totalQueries}"
				subheader="{i18n>last24Hours}"
				press=".onPressLogs"
				tooltip="{i18n>viewQueryLog}">
```
This looks fine.

What about `Dashboard.view.xml` Table rows? They use `type="Navigation"`:
```xml
                                <ColumnListItem type="Navigation" press=".onPressClient" tooltip="{parts:[{path:'i18n>viewLogsFor'}, {path:'name'}], formatter: '.formatter.formatMessage'}">
```
This is good!

Wait, what about the Select for Gemini Model in `SettingsDialog.fragment.xml`?
```xml
				<Label text="Gemini Model" labelFor="modelSelect" class="sapUiSmallMarginTop"/>
				<Select
					id="modelSelect"
					selectedKey="{/selectedModel}"
					items="{/availableModels}"
					width="100%">
					<core:Item key="{key}" text="{text}" />
				</Select>
```
Wait, does it have `busy` state or loading indicator when fetching available models?
In `BaseController.ts`:
```typescript
        if (apiKey) {
            dialog.setBusy(true);
            try {
                const models = await GeminiService.getInstance().getAvailableModels();
```
It sets the whole dialog to busy.

Let's look at `Logs.view.xml`:
```xml
                            <Button text="{i18n>smartAnalysis}" icon="sap-icon://lightbulb" press=".onAnalyzeLogs" type="Emphasized" tooltip="{i18n>generateAIInsights}" />
```
Is there an empty state for the InsightsDialog?
```xml
<core:FragmentDefinition
	xmlns="sap.m"
	xmlns:core="sap.ui.core">
	<Dialog
		id="insightsDialog"
		title="AdGuard AI Insights"
		contentWidth="600px"
		contentHeight="500px"
		resizable="true">
		<content>
			<VBox class="sapUiSmallMargin">
                <Text text="Analysis based on recent logs:" class="sapUiSmallMarginBottom" />
                <!-- HTML content takes formatting (strong headers, breaks) -->
                <core:HTML content="{view>/analysisHtml}" preferDOM="false" />
			</VBox>
		</content>
		<buttons>
			<Button text="{i18n>copyAction}" icon="sap-icon://copy" press=".onCopyInsights" tooltip="{i18n>copyAnalysis}" />
			<Button text="{i18n>closeAction}" press=".onCloseInsights" />
		</buttons>
	</Dialog>
</core:FragmentDefinition>
```
What happens if the text is very long? `<VBox>` doesn't have `renderType="Bare"` and the Dialog has `contentHeight="500px"`. Will it scroll?
Yes, `sap.m.Dialog` has built-in scrolling for its `content` aggregation.
Wait, what if `analysisHtml` has no content? We only open the dialog if there are insights.

What about empty state for Advanced Filter Table?! Yes! I decided this earlier!
Let's see: `webapp/view/fragment/AdvancedFilterDialog.fragment.xml`
```xml
			<Table
				id="filterTable"
				ariaLabelledBy="advancedFilterTitle"
				items="{view>/advancedFilters}"
				mode="None"
				growing="false"
				width="100%">
```
It has NO `noData` aggregation.
If I open this dialog and it has no conditions, it shows an empty table grid, which is bad UX.
Adding an `IllustratedMessage` will be much more pleasant to use.

Let's do the AdvancedFilter empty state.

Wait, what if there's an even better micro UX?
What about adding a character counter to `System Context (Optional)` input?
`SettingsDialog.fragment.xml`:
```xml
				<TextArea
					id="contextInput"
					value="{/systemContext}"
					placeholder="Describe your network (e.g., Raspberry Pi 5, Unbound, IoT devices...)"
					rows="4"
					width="100%"
					maxLength="500"
					showExceededText="true"
					valueLiveUpdate="true" />
```
Wait, the character count is already there (`showExceededText="true"` and `valueLiveUpdate="true"`)!

What about `Login.view.xml` username and password?
```xml
                            <Input id="usernameInput" value="{/username}" required="true" placeholder="Enter your username" submit=".onLoginPress" liveChange=".onInputChange" maxLength="50" />
```
It does not have `showExceededText`. But usernames usually don't need a live character count unless you get close to 50.

Let's look at `Dashboard.view.xml` again:
```xml
<OverflowToolbar>
    <Text text="{i18n>lastUpdated} {path: '/lastUpdated', type: 'DateTime', formatOptions: { style: 'medium' }}" visible="{= !!${/lastUpdated} }" class="sapUiTinyMarginBegin" />
```
Wait, in `Dashboard.view.xml` footer:
```xml
				<Button icon="sap-icon://refresh" type="Transparent" press=".onManualRefresh" tooltip="{i18n>refreshData}" class="sapUiTinyMarginBegin" />
```
This refresh button does not spin while loading?
If `Dashboard.controller.ts` calls `this.getView()?.setBusy(true);`, it blocks the entire screen with a spinner. This is fine.

Is there any missing placeholder or tooltip on the "Operator" and "Column" select fields?
```xml
							<ComboBox tooltip="{i18n>column}" selectedKey="{view>column}" width="100%">
```
It has `tooltip="{i18n>column}"`.

Wait! The `<ComboBox>` control does not natively use `aria-label`.
But memory says:
`In SAPUI5, aria-label is not a valid native property for standard controls like sap.m.ComboBox and sap.m.Input in XML views. Instead, use ariaLabelledBy (referencing a visible label or sap.ui.core.InvisibleText), tooltip, or placeholder to ensure screen reader accessibility.`
So `tooltip` is fine!

What about `Table` sorting buttons in `Logs.view.xml`?
```xml
								<Button text="{i18n>time}" press=".onSort" type="Transparent" tooltip="{parts:[{path:'i18n>sortBy'}, {path:'i18n>time'}], formatter: '.formatter.formatMessage'}">
```
They have tooltips!

Let's consider `Logs.view.xml` advanced filter row deletion button:
```xml
							<Button icon="sap-icon://delete" type="Transparent" press=".onRemoveFilterRow" tooltip="{i18n>removeCondition}" />
```
It has a tooltip!

Is there anything missing for accessibility on `<Link>` in `SettingsDialog.fragment.xml`?
```xml
<Link text="Get an API Key" href="https://aistudio.google.com/app/apikey" target="_blank" class="sapUiSmallMarginBottom" />
```
When opening in a new tab (`target="_blank"`), the user should be warned. However, modern browsers handle this, but adding an explicit tooltip like "Opens in a new tab" or an `aria-label` could improve UX. Wait, `Link` control has `target="_blank"`, screen readers usually announce this natively in modern browsers.

Is there a `sap.m.IllustratedMessage` added to `AdvancedFilterDialog` when there are no advanced filters? I should implement this! It fits the "Empty state with helpful guidance" perfectly.

Let's add `noFilterConditions` and `noFilterConditionsDesc` to `i18n.properties`.
In `webapp/i18n/i18n.properties`:
```properties
noFilterConditions=No Filter Conditions
noFilterConditionsDesc=Click 'Add Condition' to refine your search.
```

In `webapp/view/fragment/AdvancedFilterDialog.fragment.xml`:
```xml
			<Table
				id="filterTable"
				ariaLabelledBy="advancedFilterTitle"
				items="{view>/advancedFilters}"
				mode="None"
				growing="false"
				width="100%">
				<noData>
					<IllustratedMessage illustrationType="sapIllus-EmptyList" title="{i18n>noFilterConditions}" description="{i18n>noFilterConditionsDesc}" />
				</noData>
```

Let's do this! It adds visual polish and guidance.

Let's do a quick grep to make sure `noFilterConditions` doesn't exist already.

Let's do this UX improvement. It adds a nice empty state illustration when there are no advanced filter conditions in the dialog. It guides the user properly rather than just displaying "No data".

I'll formulate a plan:
1. Update `webapp/i18n/i18n.properties`, `webapp/i18n/i18n_en.properties`, `webapp/i18n/i18n_de.properties`, and `webapp/i18n/i18n_tr.properties` to add `noFilterConditions` and `noFilterConditionsDesc` localized strings.
2. Update `webapp/view/fragment/AdvancedFilterDialog.fragment.xml` to include `<noData>` aggregation with `sap.m.IllustratedMessage`.
3. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
4. Submit PR.

**Note**: The pre-existing failing tests `formatInsights` and `onInit size limit` in `Logs.qunit.ts` are still there. My changes did not introduce any new failures. Coverage errors are standard in this project due to strict pre-existing configuration. Tests pass otherwise.

**Reflecting on the Screenshot:**
The screenshot shows the Advanced Filter Dialog with my new `IllustratedMessage` empty state. It successfully renders "No Filter Conditions" as the primary message, with "Click 'Add Condition' to refine your search." as the helper text. The icon (sapIllus-EmptyList) is centered nicely under the table headers. This provides a clear, high-quality micro-UX improvement compared to simply rendering a blank row or generic "No data" text.

I have achieved the UX/A11y goal: "Add an empty state with helpful guidance".
