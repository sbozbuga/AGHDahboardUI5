import opaTest from "sap/ui/test/opaQunit";
import AppPage from "./pages/AppPage";

const onTheAppPage = new AppPage();

opaTest("Should see the initial page of the app", function () {
    // Arrangements
    onTheAppPage.iStartMyUIComponent({
        componentConfig: {
            name: "ui5.aghd"
        }
    });

    // Actions

    // Assertions
    onTheAppPage.iShouldSeeTheApp();

    // Cleanup
    onTheAppPage.iTeardownMyApp();
});
