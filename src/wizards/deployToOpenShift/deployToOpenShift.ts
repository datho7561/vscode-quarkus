import { Uri, window } from "vscode";
import { ProjectLabelInfo } from "../../definitions/ProjectLabelInfo";
import { getOpenShiftConnector, installOpenShiftConnectorWithProgress, isOpenShiftConnectorInstalled, OpenShiftComponentInformation, OpenShiftConnector, OPENSHIFT_CONNECTOR } from "../../utils/openShiftConnectorUtils";
import { getQuarkusProject } from "../getQuarkusProject";

/**
 * Attempts to select a Quarkus project, then deploy it to OpenShift using OpenShift Connector
 *
 * @returns when the deploy to OpenShift succeeds, or when the deploy to OpenShift fails
 * @throws if the OpenShift Connector installation fails
 */
export async function deployToOpenShift(): Promise<void> {
  await installOpenShiftConnectorIfNeeded();
  const quarkusProject: ProjectLabelInfo = await getQuarkusProject();
  const quarkusComponent: OpenShiftComponentInformation = {
    uri: Uri.parse(quarkusProject.uri),
    name: quarkusProject.name
  };
  if (await OpenShiftConnector.isExistingComponent(quarkusComponent)) {
    await OpenShiftConnector.push(quarkusComponent);
  } else {
    await OpenShiftConnector.create(quarkusComponent);
  }
}

/**
 * Installs the OpenShift Connector extension if its missing, then returns the extension API
 *
 * @throws Error if the extension is not installed and something prevents installation
 * @returns the OpenShift Connector extension API
 */
async function installOpenShiftConnectorIfNeeded(): Promise<any> {
  if (isOpenShiftConnectorInstalled()) {
    return getOpenShiftConnector();
  }
  return askToInstallOpenShiftConnector();
}

/**
 * Resolves to the OpenShift connector extension API, or rejects if the extension is missing and the user doesn't want to install it
 *
 * @throws Error if the extension is missing and the user can't or doesn't want to install it
 * @returns the OpenShift connector extension API
 */
async function askToInstallOpenShiftConnector(): Promise<any> {
  const YES: string = 'Yes';
  const NO: string = 'No';
  const response: string = await window.showInformationMessage(`${OPENSHIFT_CONNECTOR} is needed to deploy to OpenShift. Install it now?`, YES, NO);
  if (response === YES) {
    try {
      await installOpenShiftConnectorWithProgress();
      if (isOpenShiftConnectorInstalled()) {
        return getOpenShiftConnector();
      }
    } catch (e) {
      throw new Error(`${OPENSHIFT_CONNECTOR} installation failed`);
    }
  }
  throw new Error(`${OPENSHIFT_CONNECTOR} needs to be installed to deploy to OpenShift`);
}
