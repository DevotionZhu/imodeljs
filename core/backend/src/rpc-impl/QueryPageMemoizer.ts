/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/

import { Logger, assert, BeDuration, ActivityLoggingContext } from "@bentley/bentleyjs-core";
import { RpcPendingResponse, IModelToken, PageOptions } from "@bentley/imodeljs-common";
import { PromiseMemoizer, QueryablePromise } from "../PromiseMemoizer";
import { IModelDb } from "../IModelDb";
import { Config } from "@bentley/imodeljs-clients";

const kLoggingCategory = "imodeljs-backend.IModelDb";
const kDefaultQueryPageTimeout = 2 * 1000; // 2 seconds
const kQueryPageTimeOutKey = "imjs_query_page_timeout";
/** Represent args for query page
 * @hidden
 */
interface QueryPageArgs {
  actx: ActivityLoggingContext;
  iModelToken: IModelToken;
  ecsql: string;
  bindings?: any[] | object;
  options?: PageOptions;
}
/** Key generator for memoizer
 * @hidden
 */
function generateQueryPageRequestKey(args: QueryPageArgs) {
  let key = args.ecsql;
  if (args.bindings)
    key += ":" + JSON.stringify(args.bindings);
  if (args.options) {
    if (args.options.size)
      key += ":" + args.options.size;
    if (args.options.start)
      key += ":" + args.options.start;
  }
  return key;
}
/** Calls into queryPage to get result in case we did not found it in Cache.
 * @hidden
 */
async function queryPage(args: QueryPageArgs): Promise<any[]> {
  const iModelDb: IModelDb = IModelDb.find(args.iModelToken);
  const rows = iModelDb.queryPage(args.ecsql, args.bindings, args.options);
  const ecsql = args.ecsql;
  Logger.logTrace(kLoggingCategory, "IModelDbRemoting.querypage", () => ({ ecsql }));
  return rows;
}
/** Utility to cache and retrieve results of long running queryPagerequests
 * The cache is keyed on the input arguments passed to open
 * @hidden
 */
export class QueryPageMemoizer extends PromiseMemoizer<any[]> {
  private static _instance: QueryPageMemoizer;
  private constructor(private _timeout: number) {
    super(queryPage, generateQueryPageRequestKey);
  }

  private _superMemoize = this.memoize;
  public memoize = (args: QueryPageArgs): QueryablePromise<any[]> => {
    return this._superMemoize(args);
  }

  private _superDeleteMemoized = this.deleteMemoized;
  public deleteMemoized = (args: QueryPageArgs) => {
    this._superDeleteMemoized(args);
  }

  private async perform(args: QueryPageArgs): Promise<any[]> {
    args.actx.enter();
    const pageQP = this.memoize(args);
    const waitPromise = BeDuration.wait(this._timeout);
    await Promise.race([pageQP.promise, waitPromise]);

    args.actx.enter();

    if (pageQP.isPending) {
      throw new RpcPendingResponse();
    }

    this.deleteMemoized(args);

    if (pageQP.isFulfilled) {
      return pageQP.result!;
    }

    assert(pageQP.isRejected);
    throw pageQP.error!;
  }

  public static async perform(props: QueryPageArgs): Promise<any[]> {
    if (undefined === this._instance) {
      const timeOut = Config.App.has(kQueryPageTimeOutKey) ? Config.App.getNumber(kQueryPageTimeOutKey) : kDefaultQueryPageTimeout;
      this._instance = new QueryPageMemoizer(timeOut);
    }

    return this._instance.perform(props);
  }
}
