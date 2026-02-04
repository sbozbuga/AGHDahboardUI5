import opaTest from "sap/ui/test/opaQunit";
import AppPage from "./pages/AppPage";

const onTheAppPage = new AppPage();

opaTest("Should see the initial page of the app", function () {
    // Arrangements
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    onTheAppPage.iStartMyUIComponent({
        componentConfig: {
            name: "ui5.aghd"
        }
    });

    // Actions

    // Assertions
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    onTheAppPage.iShouldSeeTheApp();

    // Cleanup
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    onTheAppPage.iTeardownMyApp();
});
