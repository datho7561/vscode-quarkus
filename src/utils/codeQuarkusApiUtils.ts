import { IncomingMessage } from "http";
import * as https from "https";
import * as yaml from "js-yaml";
import * as path from "path";
import { QuarkusConfig } from "../QuarkusConfig";

export namespace CodeQuarkusApiUtils {

  export interface Functionality {
    canExcludeSampleCode: boolean;
  }

  /**
   * Returns the capabilities of the Code Quarkus API instance that is defined in the user settings
   *
   * @returns the capabilities of the Code Quarkus API instance that is defined in the user settings
   * @throws if something goes wrong when getting the functionality from OpenAPI
   */
  export async function getCodeQuarkusApiFunctionality(): Promise<Functionality> {
    const oldOpenApiUrl: string = path.dirname(QuarkusConfig.getApiUrl()) + '/openapi';
    const newOpenApiUrl: string = path.dirname(QuarkusConfig.getApiUrl()) + '/q/openapi';
    let openApiYaml: string;
    try {
      openApiYaml = await httpsGet(oldOpenApiUrl);
    } catch {
      openApiYaml = await httpsGet(newOpenApiUrl);
    }
    const openApiData: any = yaml.load(openApiYaml);

    return {
      canExcludeSampleCode: openApiData?.paths?.['/api/download']?.get?.parameters?.filter(p => p?.name === 'ne').length > 0
    } as Functionality;
  }

  /**
   * Returns a set of capabilities that are implemented by all Code Quarkus APIs
   *
   * @returns a set of capabilities that are implemented by all Code Quarkus APIs
   */
  export function getDefaultFunctionality() {
    return {
      canExcludeSampleCode: false
    } as Functionality;
  }

  /**
   * Returns the GET response body if the code is 200 and rejects otherwise
   *
   * @param url URL to GET
   * @returns the response body if the code is 200 and rejects otherwise
   * @throws if anything goes wrong (not 200 response, any other errors during get)
   */
  async function httpsGet(url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      https.get(url, (res: IncomingMessage) => {
        if (res.statusCode !== 200) {
          reject(`${res.statusCode}: ${res.statusMessage}`);
        }
        res.on('data', (d: Buffer) => {
          resolve(d.toString('utf8'));
        });
      })
      .on('error', reject);
    });
  }
}
