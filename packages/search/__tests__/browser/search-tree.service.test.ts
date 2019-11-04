import * as path from 'path';
import { Injector, Injectable } from '@ali/common-di';
import { ILoggerManagerClient, Uri, URI } from '@ali/ide-core-common';
import { createBrowserInjector } from '@ali/ide-dev-tool/src/injector-helper';
import { LoggerManagerClient  } from '@ali/ide-logs/src/browser/log-manage';
import { IWorkspaceService } from '@ali/ide-workspace';
import { EditorDocumentModelServiceImpl } from '@ali/ide-editor/lib/browser/doc-model/main';
import { IEditorDocumentModelService } from '@ali/ide-editor/lib/browser';
import { IMainLayoutService } from '@ali/ide-main-layout/lib/common';
import { WorkbenchEditorService } from '@ali/ide-editor';
import { OverlayModule } from '@ali/ide-overlay/lib/browser';

import { ContentSearchClientService } from '../../src/browser/search.service';
import {
  IContentSearchClientService,
  ContentSearchServerPath,
  ContentSearchOptions,
  ISearchTreeItem,
  SendClientResult,
  SEARCH_STATE,
  ContentSearchResult,
  IUIState,
} from '../../src/common';
import { SearchModule } from '../../src/browser/';
import { SearchTreeService } from '../../src/browser/search-tree.service';

const rootUri = Uri.file(path.resolve(__dirname, '../test-resources/')).toString();

@Injectable()
class MockWorkspaceService {
  tryGetRoots() {
    return [{
      uri: rootUri,
    }];
  }

  setMostRecentlySearchWord() {

  }
}

@Injectable()
class MockMainLayoutService {
  getTabbarHandler() {}
}

@Injectable()
class MockSearchContentService {
  catchSearchValue: string;
  catchSearchRootDirs: string[];
  catchSearchOptions: ContentSearchOptions;

  async search(value, rootDirs , searchOptions) {
    this.catchSearchValue = value;
    this.catchSearchRootDirs = rootDirs;
    this.catchSearchOptions = searchOptions;

    return 1;
  }

  cancel() {}
}

@Injectable()
class MockWorkbenchEditorService {
  open() {}
}

describe('search.service.ts', () => {
  let injector: Injector;
  let searchService: IContentSearchClientService;
  let searchTreeService: SearchTreeService;
  const parent: any = {
    expanded: false,
    id: 'p-1',
    name: '',
    uri: new URI('file://root'),
    children: [],
  };

  const searchResult1 = { fileUri: 'file://root', line: 1, matchStart: 11, matchLength: 12, renderLineText: '', renderStart: 2 };
  const searchResult2 = Object.assign({}, searchResult1, { line: 2});
  const searchResults: Map<string, ContentSearchResult[]> = new Map();

  searchResults.set('file://root', [searchResult1, searchResult2]);

  beforeAll(() => {
    injector = createBrowserInjector([
      OverlayModule,
      SearchModule,
    ]);

    injector.addProviders({
      token: ContentSearchClientService,
      useClass: ContentSearchClientService,
    }, {
      token: ILoggerManagerClient,
      useClass: LoggerManagerClient,
    }, {
      token: IWorkspaceService,
      useClass: MockWorkspaceService,
    }, {
      token: ContentSearchServerPath,
      useClass: MockSearchContentService,
    }, {
      token: IEditorDocumentModelService,
      useClass : EditorDocumentModelServiceImpl,
    }, {
      token: IMainLayoutService,
      useClass : MockMainLayoutService,
    }, {
      token: WorkbenchEditorService,
      useClass: MockWorkbenchEditorService,
    });

    searchService = injector.get(ContentSearchClientService);
    searchTreeService = injector.get(SearchTreeService);

    searchService.searchResults = searchResults;
    searchService.resultTotal = { resultNum: 2, fileNum: 1 };

    // without docModel
    (searchService as any).workbenchEditorService = true;
    (searchService as any).searchAllFromDocModel = () => {
      return {
        result: null,
      };
    };
  });

  test('可以加载正常service', () => {
    expect(searchTreeService._nodes).toBeDefined();
  });

  test('初始化nodes', () => {
    const childList = (searchTreeService as any).getChildrenNodes(searchService.searchResults, parent);
    parent.children.push(childList);
    const nodeList = [parent, ...childList];
    searchTreeService.nodes = nodeList;

    expect(searchTreeService._nodes).toEqual(nodeList);
  });

  test('method: onSelect 父节点', () => {
    searchTreeService.onSelect([parent]);

    expect(searchTreeService.nodes[0].expanded).toEqual(true);
  });

  test('method: commandActuator closeResult', () => {
    searchTreeService.commandActuator('closeResult', 'file://root?index=0');

    expect(searchService.searchResults.get('file://root')!.length).toEqual(1);
  });

  test('method: commandActuator closeResults', () => {
    searchTreeService.commandActuator('closeResults', 'file://root');

    expect(searchService.searchResults.size).toEqual(0);
  });

});
