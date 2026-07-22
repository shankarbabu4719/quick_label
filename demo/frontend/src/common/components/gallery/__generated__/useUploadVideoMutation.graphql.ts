/**
 * @generated SignedSource<<183f7c2fcd4c9ee55885b6129826e88e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest, Mutation } from 'relay-runtime';
export type useUploadVideoMutation$variables = {
  file: any;
};
export type useUploadVideoMutation$data = {
  readonly uploadVideo: {
    readonly durationSec: number | null | undefined;
    readonly height: number;
    readonly id: any;
    readonly path: string;
    readonly posterPath: string | null | undefined;
    readonly posterUrl: string;
    readonly url: string;
    readonly width: number;
  };
};
export type useUploadVideoMutation = {
  response: useUploadVideoMutation$data;
  variables: useUploadVideoMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "file"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "file",
        "variableName": "file"
      }
    ],
    "concreteType": "Video",
    "kind": "LinkedField",
    "name": "uploadVideo",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "height",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "width",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "url",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "path",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "posterPath",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "posterUrl",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "durationSec",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "useUploadVideoMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "useUploadVideoMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "c6259226794dde0b87d19e6ba5218902",
    "id": null,
    "metadata": {},
    "name": "useUploadVideoMutation",
    "operationKind": "mutation",
    "text": "mutation useUploadVideoMutation(\n  $file: Upload!\n) {\n  uploadVideo(file: $file) {\n    id\n    height\n    width\n    url\n    path\n    posterPath\n    posterUrl\n    durationSec\n  }\n}\n"
  }
};
})();

(node as any).hash = "138c82e4b83d6f92d7a1a8155cb09669";

export default node;
