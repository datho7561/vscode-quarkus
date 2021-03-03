import * as fs from 'fs-extra';
import * as path from 'path';
import { commands, Disposable, Extension, extensions, ProgressLocation, Uri, window } from "vscode";

export const OPENSHIFT_CONNECTOR_EXTENSION_ID: string = 'redhat.vscode-openshift-connector';
export const OPENSHIFT_CONNECTOR = 'OpenShift Connector extension';
const DOWNLOAD_TIMEOUT: number = 60000; // Timeout for downloading VSCode OpenShift Connector, in milliseconds

/**
 * Returns true if the OpenShift connector extension is installed, and false otherwise
 *
 * @returns true if the OpenShift connector extension is installed, and false otherwise
 */
export function isOpenShiftConnectorInstalled(): boolean {
  return !!extensions.getExtension(OPENSHIFT_CONNECTOR_EXTENSION_ID);
}

/**
 * Returns the OpenShift Connector extension API
 *
 * @throws Error if the extension is not installed
 * @returns the OpenShift Connector extension API
 */
export async function getOpenShiftConnector(): Promise<any> {
  if (!isOpenShiftConnectorInstalled()) {
    throw new Error(`${OPENSHIFT_CONNECTOR} is not installed`);
  }
  const openShiftConnector: Extension<any> = extensions.getExtension(OPENSHIFT_CONNECTOR_EXTENSION_ID);
  if (openShiftConnector.isActive) {
    return openShiftConnector.exports;
  }
  return extensions.getExtension(OPENSHIFT_CONNECTOR_EXTENSION_ID).activate();
}

/**
 * Install the OpenShift Connector extension
 *
 * @returns when the extension is installed
 * @throws if the user refuses to install the extension, or if the extension does not get installed within a timeout period
 */
async function installOpenShiftConnector(): Promise<void> {
  const installListenerDisposables: Disposable[] = [];
  return Promise.race([
    new Promise<void>((resolve, reject) => {
      extensions.onDidChange(() => {
        if (isOpenShiftConnectorInstalled()) {
          installListenerDisposables.forEach((d: Disposable) => { d.dispose(); });
          resolve();
        }
      }, null, installListenerDisposables);
      commands.executeCommand("workbench.extensions.installExtension", OPENSHIFT_CONNECTOR_EXTENSION_ID)
        .then((_unused: any) => { }, reject);
    }),
    new Promise<void>((_unused, reject) => {
      // Fail install if it takes longer than the timeout period
      setTimeout(reject, DOWNLOAD_TIMEOUT, new Error(`${OPENSHIFT_CONNECTOR} installation is taking a while. Cancelling 'Deploy to OpenShift'`));
    })
  ]).catch(e => {
    installListenerDisposables.forEach((d: Disposable) => { d.dispose(); });
    throw e;
  });
}

/**
 * Install the OpenShift Connector extension and show the progress
 *
 * @returns when the extension is installed
 * @throws if the extension installation fails or times out
 */
export async function installOpenShiftConnectorWithProgress(): Promise<void> {
  await window.withProgress({ location: ProgressLocation.Notification, title: `Installing ${OPENSHIFT_CONNECTOR}...` }, progress => {
    return installOpenShiftConnector();
  });
  window.showInformationMessage(`Successfully installed ${OPENSHIFT_CONNECTOR}.`);
}

/**
 * Represents an OpenShift component
 */
export interface OpenShiftComponentInformation {
  name: string;
  uri: Uri;
}

export namespace OpenShiftConnector {

  /**
   * Attempts to push the component to OpenShift, and resolves once it has succeeded or failed
   *
   * @param component the component to push to OpenShift
   * @returns once the component has been pushed to OpenShift, or when the push to OpenShift fails
   */
  export async function push(component: OpenShiftComponentInformation): Promise<void> {
    await commands.executeCommand("openshift.component.push", //
      // This is the bare minimum info that is needed to push the component out of the following interface:
      // https://github.com/redhat-developer/vscode-openshift-tools/blob/66210684eb4bd739ae062af6a47335ea33d36b07/src/odo.ts#L36
      {
        contextPath: component.uri,
        getName: () => { return component.name; }
      }
    );
  }

  /**
   * Attempts to create a component from the given component information, and resolves once it has succeeded or failed
   *
   * @param component The OpenShiftComponent to create
   * @returns once the component has been created, or when the component creation fails
   */
  export async function create(component: OpenShiftComponentInformation): Promise<void> {
    await commands.executeCommand("openshift.component.createFromRootWorkspaceFolder", //
      component.uri, // uri to the project folder
      [] as Uri[], // unused in OpenShift Connector
      undefined, // OpenShift context
      "java-quarkus"); // use java quarkus devfile
  }

  /**
   * Returns true if the given component has been created and false otherwise
   *
   * @param component the component to check if it exists
   * @returns true if the given component has been created and false otherwise
   */
  export async function isExistingComponent(component: OpenShiftComponentInformation): Promise<boolean> {
    return fs.pathExists(path.join(component.uri.fsPath, '.odo'));
  }

}
