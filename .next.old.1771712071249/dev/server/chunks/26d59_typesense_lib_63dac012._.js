module.exports = [
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/TypesenseError.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var TypesenseError = function(_super) {
    tslib_1.__extends(TypesenseError, _super);
    // Source: https://stackoverflow.com/a/58417721/123545
    function TypesenseError(message, httpBody, httpStatus) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, message) || this;
        _this.name = _newTarget.name;
        _this.httpBody = httpBody;
        _this.httpStatus = httpStatus;
        Object.setPrototypeOf(_this, _newTarget.prototype);
        return _this;
    }
    return TypesenseError;
}(Error);
exports.default = TypesenseError; //# sourceMappingURL=TypesenseError.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/HTTPError.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var TypesenseError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/TypesenseError.js [app-route] (ecmascript)"));
var HTTPError = function(_super) {
    tslib_1.__extends(HTTPError, _super);
    function HTTPError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTTPError;
}(TypesenseError_1.default);
exports.default = HTTPError; //# sourceMappingURL=HTTPError.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/MissingConfigurationError.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var TypesenseError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/TypesenseError.js [app-route] (ecmascript)"));
var MissingConfigurationError = function(_super) {
    tslib_1.__extends(MissingConfigurationError, _super);
    function MissingConfigurationError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return MissingConfigurationError;
}(TypesenseError_1.default);
exports.default = MissingConfigurationError; //# sourceMappingURL=MissingConfigurationError.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/ObjectAlreadyExists.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var TypesenseError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/TypesenseError.js [app-route] (ecmascript)"));
var ObjectAlreadyExists = function(_super) {
    tslib_1.__extends(ObjectAlreadyExists, _super);
    function ObjectAlreadyExists() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ObjectAlreadyExists;
}(TypesenseError_1.default);
exports.default = ObjectAlreadyExists; //# sourceMappingURL=ObjectAlreadyExists.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/ObjectNotFound.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var TypesenseError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/TypesenseError.js [app-route] (ecmascript)"));
var ObjectNotFound = function(_super) {
    tslib_1.__extends(ObjectNotFound, _super);
    function ObjectNotFound() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ObjectNotFound;
}(TypesenseError_1.default);
exports.default = ObjectNotFound; //# sourceMappingURL=ObjectNotFound.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/ObjectUnprocessable.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var TypesenseError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/TypesenseError.js [app-route] (ecmascript)"));
var ObjectUnprocessable = function(_super) {
    tslib_1.__extends(ObjectUnprocessable, _super);
    function ObjectUnprocessable() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ObjectUnprocessable;
}(TypesenseError_1.default);
exports.default = ObjectUnprocessable; //# sourceMappingURL=ObjectUnprocessable.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/RequestMalformed.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var TypesenseError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/TypesenseError.js [app-route] (ecmascript)"));
var RequestMalformed = function(_super) {
    tslib_1.__extends(RequestMalformed, _super);
    function RequestMalformed() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return RequestMalformed;
}(TypesenseError_1.default);
exports.default = RequestMalformed; //# sourceMappingURL=RequestMalformed.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/RequestUnauthorized.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var TypesenseError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/TypesenseError.js [app-route] (ecmascript)"));
var RequestUnauthorized = function(_super) {
    tslib_1.__extends(RequestUnauthorized, _super);
    function RequestUnauthorized() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return RequestUnauthorized;
}(TypesenseError_1.default);
exports.default = RequestUnauthorized; //# sourceMappingURL=RequestUnauthorized.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/ServerError.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var TypesenseError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/TypesenseError.js [app-route] (ecmascript)"));
var ServerError = function(_super) {
    tslib_1.__extends(ServerError, _super);
    function ServerError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ServerError;
}(TypesenseError_1.default);
exports.default = ServerError; //# sourceMappingURL=ServerError.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/ImportError.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var TypesenseError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/TypesenseError.js [app-route] (ecmascript)"));
var ImportError = function(_super) {
    tslib_1.__extends(ImportError, _super);
    function ImportError(message, importResults, payload) {
        var _this = _super.call(this, message) || this;
        _this.importResults = importResults;
        _this.payload = payload;
        return _this;
    }
    return ImportError;
}(TypesenseError_1.default);
exports.default = ImportError; //# sourceMappingURL=ImportError.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/index.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ImportError = exports.TypesenseError = exports.ServerError = exports.RequestUnauthorized = exports.RequestMalformed = exports.ObjectUnprocessable = exports.ObjectNotFound = exports.ObjectAlreadyExists = exports.MissingConfigurationError = exports.HTTPError = void 0;
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var HTTPError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/HTTPError.js [app-route] (ecmascript)"));
exports.HTTPError = HTTPError_1.default;
var MissingConfigurationError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/MissingConfigurationError.js [app-route] (ecmascript)"));
exports.MissingConfigurationError = MissingConfigurationError_1.default;
var ObjectAlreadyExists_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/ObjectAlreadyExists.js [app-route] (ecmascript)"));
exports.ObjectAlreadyExists = ObjectAlreadyExists_1.default;
var ObjectNotFound_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/ObjectNotFound.js [app-route] (ecmascript)"));
exports.ObjectNotFound = ObjectNotFound_1.default;
var ObjectUnprocessable_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/ObjectUnprocessable.js [app-route] (ecmascript)"));
exports.ObjectUnprocessable = ObjectUnprocessable_1.default;
var RequestMalformed_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/RequestMalformed.js [app-route] (ecmascript)"));
exports.RequestMalformed = RequestMalformed_1.default;
var RequestUnauthorized_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/RequestUnauthorized.js [app-route] (ecmascript)"));
exports.RequestUnauthorized = RequestUnauthorized_1.default;
var ServerError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/ServerError.js [app-route] (ecmascript)"));
exports.ServerError = ServerError_1.default;
var ImportError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/ImportError.js [app-route] (ecmascript)"));
exports.ImportError = ImportError_1.default;
var TypesenseError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/TypesenseError.js [app-route] (ecmascript)"));
exports.TypesenseError = TypesenseError_1.default; //# sourceMappingURL=index.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Configuration.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var logger = tslib_1.__importStar(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/loglevel/lib/loglevel.js [app-route] (ecmascript)"));
var Errors_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/index.js [app-route] (ecmascript)");
var Configuration = function() {
    function Configuration(options) {
        var _this = this;
        this.nodes = options.nodes || [];
        this.nodes = this.nodes.map(function(node) {
            return _this.setDefaultPathInNode(node);
        }).map(function(node) {
            return _this.setDefaultPortInNode(node);
        }).map(function(node) {
            return tslib_1.__assign({}, node);
        }); // Make a deep copy
        if (options.randomizeNodes == null) {
            options.randomizeNodes = true;
        }
        if (options.randomizeNodes === true) {
            this.shuffleArray(this.nodes);
        }
        this.nearestNode = options.nearestNode;
        this.nearestNode = this.setDefaultPathInNode(this.nearestNode);
        this.nearestNode = this.setDefaultPortInNode(this.nearestNode);
        this.connectionTimeoutSeconds = options.connectionTimeoutSeconds || options.timeoutSeconds || 5;
        this.healthcheckIntervalSeconds = options.healthcheckIntervalSeconds || 60;
        this.numRetries = (options.numRetries !== undefined && options.numRetries >= 0 ? options.numRetries : this.nodes.length + (this.nearestNode == null ? 0 : 1)) || 3;
        this.retryIntervalSeconds = options.retryIntervalSeconds || 0.1;
        this.apiKey = options.apiKey;
        this.sendApiKeyAsQueryParam = options.sendApiKeyAsQueryParam; // We will set a default for this in Client and SearchClient
        this.cacheSearchResultsForSeconds = options.cacheSearchResultsForSeconds || 0; // Disable client-side cache by default
        this.useServerSideSearchCache = options.useServerSideSearchCache || false;
        this.axiosAdapter = options.axiosAdapter;
        this.logger = options.logger || logger;
        this.logLevel = options.logLevel || "warn";
        this.logger.setLevel(this.logLevel);
        this.additionalHeaders = options.additionalHeaders;
        this.httpAgent = options.httpAgent;
        this.httpsAgent = options.httpsAgent;
        this.paramsSerializer = options.paramsSerializer;
        this.showDeprecationWarnings(options);
        this.validate();
    }
    Configuration.prototype.validate = function() {
        if (this.nodes == null || this.nodes.length === 0 || this.validateNodes()) {
            throw new Errors_1.MissingConfigurationError("Ensure that nodes[].protocol, nodes[].host and nodes[].port are set");
        }
        if (this.nearestNode != null && this.isNodeMissingAnyParameters(this.nearestNode)) {
            throw new Errors_1.MissingConfigurationError("Ensure that nearestNodes.protocol, nearestNodes.host and nearestNodes.port are set");
        }
        if (this.apiKey == null) {
            throw new Errors_1.MissingConfigurationError("Ensure that apiKey is set");
        }
        return true;
    };
    Configuration.prototype.validateNodes = function() {
        var _this = this;
        return this.nodes.some(function(node) {
            return _this.isNodeMissingAnyParameters(node);
        });
    };
    Configuration.prototype.isNodeMissingAnyParameters = function(node) {
        return ![
            "protocol",
            "host",
            "port",
            "path"
        ].every(function(key) {
            return node.hasOwnProperty(key);
        }) && node["url"] == null;
    };
    Configuration.prototype.setDefaultPathInNode = function(node) {
        if (node != null && !node.hasOwnProperty("path")) {
            node["path"] = "";
        }
        return node;
    };
    Configuration.prototype.setDefaultPortInNode = function(node) {
        if (node != null && !node.hasOwnProperty("port") && node.hasOwnProperty("protocol")) {
            switch(node["protocol"]){
                case "https":
                    node["port"] = 443;
                    break;
                case "http":
                    node["port"] = 80;
                    break;
            }
        }
        return node;
    };
    Configuration.prototype.showDeprecationWarnings = function(options) {
        if (options.timeoutSeconds) {
            this.logger.warn("Deprecation warning: timeoutSeconds is now renamed to connectionTimeoutSeconds");
        }
        if (options.masterNode) {
            this.logger.warn("Deprecation warning: masterNode is now consolidated to nodes, starting with Typesense Server v0.12");
        }
        if (options.readReplicaNodes) {
            this.logger.warn("Deprecation warning: readReplicaNodes is now consolidated to nodes, starting with Typesense Server v0.12");
        }
    };
    Configuration.prototype.shuffleArray = function(array) {
        var _a;
        for(var i = array.length - 1; i > 0; i--){
            var j = Math.floor(Math.random() * (i + 1));
            _a = [
                array[j],
                array[i]
            ], array[i] = _a[0], array[j] = _a[1];
        }
    };
    return Configuration;
}();
exports.default = Configuration; //# sourceMappingURL=Configuration.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Types.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.arrayableParams = void 0;
exports.arrayableParams = {
    query_by: "query_by",
    query_by_weights: "query_by_weights",
    facet_by: "facet_by",
    group_by: "group_by",
    include_fields: "include_fields",
    exclude_fields: "exclude_fields",
    highlight_fields: "highlight_fields",
    highlight_full_fields: "highlight_full_fields",
    pinned_hits: "pinned_hits",
    hidden_hits: "hidden_hits",
    infix: "infix",
    override_tags: "override_tags",
    num_typos: "num_typos",
    prefix: "prefix",
    sort_by: "sort_by"
}; //# sourceMappingURL=Types.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Utils.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.toErrorWithMessage = exports.normalizeArrayableParams = void 0;
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Types_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Types.js [app-route] (ecmascript)");
function hasNoArrayValues(params) {
    return Object.keys(Types_1.arrayableParams).filter(function(key) {
        return params[key] !== undefined;
    }).every(function(key) {
        return isNonArrayValue(params[key]);
    });
}
function normalizeArrayableParams(params) {
    var result = tslib_1.__assign({}, params);
    var transformedValues = Object.keys(Types_1.arrayableParams).filter(function(key) {
        return Array.isArray(result[key]);
    }).map(function(key) {
        result[key] = result[key].join(",");
        return key;
    });
    if (!transformedValues.length && hasNoArrayValues(result)) {
        return result;
    }
    if (!hasNoArrayValues(result)) {
        throw new Error("Failed to normalize arrayable params: ".concat(JSON.stringify(result)));
    }
    return result;
}
exports.normalizeArrayableParams = normalizeArrayableParams;
function isNonArrayValue(value) {
    return !Array.isArray(value);
}
function isErrorWithMessage(error) {
    return typeof error === "object" && error !== null && "message" in error && typeof error.message === "string";
}
function toErrorWithMessage(couldBeError) {
    if (isErrorWithMessage(couldBeError)) return couldBeError;
    try {
        if (typeof couldBeError === "string") {
            return new Error(couldBeError);
        }
        return new Error(JSON.stringify(couldBeError));
    } catch (_a) {
        return new Error(String(couldBeError));
    }
}
exports.toErrorWithMessage = toErrorWithMessage; //# sourceMappingURL=Utils.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/ApiCall.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var axios_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/axios/dist/node/axios.cjs [app-route] (ecmascript)"));
var http_1 = __turbopack_context__.r("[externals]/http [external] (http, cjs)");
var https_1 = __turbopack_context__.r("[externals]/https [external] (https, cjs)");
var Errors_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/index.js [app-route] (ecmascript)");
var TypesenseError_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/TypesenseError.js [app-route] (ecmascript)"));
var Utils_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Utils.js [app-route] (ecmascript)");
var APIKEYHEADERNAME = "X-TYPESENSE-API-KEY";
var HEALTHY = true;
var UNHEALTHY = false;
var isNodeJSEnvironment = typeof process !== "undefined" && process.versions != null && process.versions.node != null && ("TURBOPACK compile-time value", "undefined") === "undefined";
var ApiCall = function() {
    function ApiCall(configuration) {
        this.configuration = configuration;
        this.apiKey = this.configuration.apiKey;
        this.nodes = this.configuration.nodes == null ? this.configuration.nodes : JSON.parse(JSON.stringify(this.configuration.nodes)); // Make a copy, since we'll be adding additional metadata to the nodes
        this.nearestNode = this.configuration.nearestNode == null ? this.configuration.nearestNode : JSON.parse(JSON.stringify(this.configuration.nearestNode));
        this.connectionTimeoutSeconds = this.configuration.connectionTimeoutSeconds;
        this.healthcheckIntervalSeconds = this.configuration.healthcheckIntervalSeconds;
        this.numRetriesPerRequest = this.configuration.numRetries;
        this.retryIntervalSeconds = this.configuration.retryIntervalSeconds;
        this.sendApiKeyAsQueryParam = this.configuration.sendApiKeyAsQueryParam;
        this.additionalUserHeaders = this.configuration.additionalHeaders;
        this.logger = this.configuration.logger;
        this.initializeMetadataForNodes();
        this.currentNodeIndex = -1;
    }
    ApiCall.prototype.get = function(endpoint, queryParameters, _a) {
        if (queryParameters === void 0) {
            queryParameters = {};
        }
        var _b = _a === void 0 ? {} : _a, _c = _b.abortSignal, abortSignal = _c === void 0 ? null : _c, _d = _b.responseType, responseType = _d === void 0 ? undefined : _d, _e = _b.streamConfig, streamConfig = _e === void 0 ? undefined : _e, isStreamingRequest = _b.isStreamingRequest;
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_f) {
                return [
                    2 /*return*/ ,
                    this.performRequest("get", endpoint, {
                        queryParameters: queryParameters,
                        abortSignal: abortSignal,
                        responseType: responseType,
                        streamConfig: streamConfig,
                        isStreamingRequest: isStreamingRequest
                    })
                ];
            });
        });
    };
    ApiCall.prototype.delete = function(endpoint, queryParameters) {
        if (queryParameters === void 0) {
            queryParameters = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.performRequest("delete", endpoint, {
                        queryParameters: queryParameters,
                        isStreamingRequest: false
                    })
                ];
            });
        });
    };
    ApiCall.prototype.post = function(endpoint, bodyParameters, queryParameters, additionalHeaders, _a) {
        if (bodyParameters === void 0) {
            bodyParameters = {};
        }
        if (queryParameters === void 0) {
            queryParameters = {};
        }
        if (additionalHeaders === void 0) {
            additionalHeaders = {};
        }
        var _b = _a === void 0 ? {} : _a, _c = _b.abortSignal, abortSignal = _c === void 0 ? null : _c, _d = _b.responseType, responseType = _d === void 0 ? undefined : _d, _e = _b.streamConfig, streamConfig = _e === void 0 ? undefined : _e, isStreamingRequest = _b.isStreamingRequest;
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_f) {
                return [
                    2 /*return*/ ,
                    this.performRequest("post", endpoint, {
                        queryParameters: queryParameters,
                        bodyParameters: bodyParameters,
                        additionalHeaders: additionalHeaders,
                        abortSignal: abortSignal,
                        responseType: responseType,
                        streamConfig: streamConfig,
                        isStreamingRequest: isStreamingRequest
                    })
                ];
            });
        });
    };
    ApiCall.prototype.put = function(endpoint, bodyParameters, queryParameters) {
        if (bodyParameters === void 0) {
            bodyParameters = {};
        }
        if (queryParameters === void 0) {
            queryParameters = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.performRequest("put", endpoint, {
                        queryParameters: queryParameters,
                        bodyParameters: bodyParameters,
                        isStreamingRequest: false
                    })
                ];
            });
        });
    };
    ApiCall.prototype.patch = function(endpoint, bodyParameters, queryParameters) {
        if (bodyParameters === void 0) {
            bodyParameters = {};
        }
        if (queryParameters === void 0) {
            queryParameters = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.performRequest("patch", endpoint, {
                        queryParameters: queryParameters,
                        bodyParameters: bodyParameters,
                        isStreamingRequest: false
                    })
                ];
            });
        });
    };
    ApiCall.prototype.getAdapter = function() {
        if (!this.configuration.axiosAdapter) return undefined;
        if (typeof this.configuration.axiosAdapter === "function") return this.configuration.axiosAdapter;
        var isCloudflareWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
        return isCloudflareWorkers ? axios_1.default.getAdapter(this.configuration.axiosAdapter).bind(globalThis) : axios_1.default.getAdapter(this.configuration.axiosAdapter);
    };
    ApiCall.prototype.performRequest = function(requestType, endpoint, _a) {
        var _b, _c, _d, _e;
        var _f = _a.queryParameters, queryParameters = _f === void 0 ? null : _f, _g = _a.bodyParameters, bodyParameters = _g === void 0 ? null : _g, _h = _a.additionalHeaders, additionalHeaders = _h === void 0 ? {} : _h, _j = _a.abortSignal, abortSignal = _j === void 0 ? null : _j, _k = _a.responseType, responseType = _k === void 0 ? undefined : _k, _l = _a.skipConnectionTimeout, skipConnectionTimeout = _l === void 0 ? false : _l, _m = _a.enableKeepAlive, enableKeepAlive = _m === void 0 ? undefined : _m, _o = _a.streamConfig, streamConfig = _o === void 0 ? undefined : _o, isStreamingRequest = _a.isStreamingRequest;
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            var requestNumber, lastException, wasAborted, _loop_1, this_1, numTries, state_1;
            return tslib_1.__generator(this, function(_p) {
                switch(_p.label){
                    case 0:
                        this.configuration.validate();
                        if (isStreamingRequest) {
                            this.logger.debug("Request: Performing streaming request to ".concat(endpoint));
                            // For browser streaming, always use responseType: "stream" and adapter: "fetch"
                            if (!isNodeJSEnvironment && typeof fetch !== "undefined") {
                                this.logger.debug("Using fetch adapter for browser streaming");
                                responseType = "stream";
                            }
                        }
                        requestNumber = Date.now();
                        wasAborted = false;
                        this.logger.debug("Request #".concat(requestNumber, ": Performing ").concat(requestType.toUpperCase(), " request: ").concat(endpoint));
                        _loop_1 = function(numTries) {
                            var node, abortListener, requestOptions, cancelToken, source_1, response, error_1;
                            return tslib_1.__generator(this, function(_q) {
                                switch(_q.label){
                                    case 0:
                                        node = this_1.getNextNode(requestNumber);
                                        this_1.logger.debug("Request #".concat(requestNumber, ": Attempting ").concat(requestType.toUpperCase(), " request Try #").concat(numTries, " to Node ").concat(node.index));
                                        if (abortSignal && abortSignal.aborted) {
                                            return [
                                                2 /*return*/ ,
                                                {
                                                    value: Promise.reject(new Error("Request aborted by caller."))
                                                }
                                            ];
                                        }
                                        abortListener = void 0;
                                        _q.label = 1;
                                    case 1:
                                        _q.trys.push([
                                            1,
                                            3,
                                            5,
                                            6
                                        ]);
                                        requestOptions = {
                                            method: requestType,
                                            url: this_1.uriFor(endpoint, node),
                                            headers: Object.assign({}, this_1.defaultHeaders(), additionalHeaders, this_1.additionalUserHeaders),
                                            maxContentLength: Infinity,
                                            maxBodyLength: Infinity,
                                            validateStatus: function(status) {
                                                /* Override default validateStatus, which only considers 2xx a success.
                                                    In our case, if the server returns any HTTP code, we will handle it below.
                                                    We do this to be able to raise custom errors based on response code.
                                                 */ return status > 0;
                                            },
                                            transformResponse: [
                                                function(data, headers) {
                                                    var transformedData = data;
                                                    if (headers !== undefined && typeof data === "string" && headers["content-type"] && headers["content-type"].startsWith("application/json")) {
                                                        transformedData = JSON.parse(data);
                                                    }
                                                    return transformedData;
                                                }
                                            ]
                                        };
                                        // Use fetch adapter only for streaming requests in browser environments
                                        requestOptions.adapter = isStreamingRequest && !isNodeJSEnvironment ? "fetch" : this_1.getAdapter();
                                        if (skipConnectionTimeout !== true) {
                                            requestOptions.timeout = this_1.connectionTimeoutSeconds * 1000;
                                        }
                                        if (queryParameters && Object.keys(queryParameters).length !== 0) {
                                            requestOptions.params = queryParameters;
                                        }
                                        if (this_1.sendApiKeyAsQueryParam) {
                                            requestOptions.params = requestOptions.params || {};
                                            requestOptions.params["x-typesense-api-key"] = this_1.apiKey;
                                        }
                                        if (this_1.configuration.httpAgent) {
                                            this_1.logger.debug("Request #".concat(requestNumber, ": Using custom httpAgent"));
                                            requestOptions.httpAgent = this_1.configuration.httpAgent;
                                        } else if (enableKeepAlive === true) {
                                            if (!isNodeJSEnvironment) {
                                                this_1.logger.warn("Request #".concat(requestNumber, ": Cannot use custom httpAgent in a browser environment to enable keepAlive"));
                                            } else {
                                                this_1.logger.debug("Request #".concat(requestNumber, ": Enabling KeepAlive"));
                                                requestOptions.httpAgent = new http_1.Agent({
                                                    keepAlive: true
                                                });
                                            }
                                        }
                                        if (this_1.configuration.httpsAgent) {
                                            this_1.logger.debug("Request #".concat(requestNumber, ": Using custom httpsAgent"));
                                            requestOptions.httpsAgent = this_1.configuration.httpsAgent;
                                        } else if (enableKeepAlive === true) {
                                            if (!isNodeJSEnvironment) {
                                                this_1.logger.warn("Request #".concat(requestNumber, ": Cannot use custom httpAgent in a browser environment to enable keepAlive"));
                                            } else {
                                                this_1.logger.debug("Request #".concat(requestNumber, ": Enabling keepAlive"));
                                                requestOptions.httpsAgent = new https_1.Agent({
                                                    keepAlive: true
                                                });
                                            }
                                        }
                                        if (this_1.configuration.paramsSerializer) {
                                            this_1.logger.debug("Request #".concat(requestNumber, ": Using custom paramsSerializer"));
                                            requestOptions.paramsSerializer = this_1.configuration.paramsSerializer;
                                        }
                                        if (bodyParameters && (typeof bodyParameters === "string" && bodyParameters.length !== 0 || typeof bodyParameters === "object" && Object.keys(bodyParameters).length !== 0)) {
                                            requestOptions.data = bodyParameters;
                                        }
                                        // Translate from user-provided AbortController to the Axios request cancel mechanism.
                                        if (abortSignal) {
                                            cancelToken = axios_1.default.CancelToken;
                                            source_1 = cancelToken.source();
                                            abortListener = function() {
                                                wasAborted = true;
                                                source_1.cancel();
                                            };
                                            abortSignal.addEventListener("abort", abortListener);
                                            requestOptions.cancelToken = source_1.token;
                                        }
                                        if (isStreamingRequest) {
                                            requestOptions.responseType = "stream";
                                            if (!isNodeJSEnvironment) {
                                                requestOptions.headers = tslib_1.__assign(tslib_1.__assign({}, requestOptions.headers), {
                                                    Accept: "text/event-stream"
                                                });
                                            }
                                        } else if (responseType) {
                                            requestOptions.responseType = responseType;
                                        }
                                        return [
                                            4 /*yield*/ ,
                                            (0, axios_1.default)(requestOptions)
                                        ];
                                    case 2:
                                        response = _q.sent();
                                        if (response.status >= 1 && response.status <= 499) {
                                            // Treat any status code > 0 and < 500 to be an indication that node is healthy
                                            // We exclude 0 since some clients return 0 when request fails
                                            this_1.setNodeHealthcheck(node, HEALTHY);
                                        }
                                        this_1.logger.debug("Request #".concat(requestNumber, ": Request to Node ").concat(node.index, " was made. Response Code was ").concat(response.status, "."));
                                        if (response.status >= 200 && response.status < 300) {
                                            if (isStreamingRequest) {
                                                return [
                                                    2 /*return*/ ,
                                                    {
                                                        value: this_1.handleStreamingResponse(response, streamConfig)
                                                    }
                                                ];
                                            }
                                            return [
                                                2 /*return*/ ,
                                                {
                                                    value: Promise.resolve(response.data)
                                                }
                                            ];
                                        } else if (response.status < 500) {
                                            return [
                                                2 /*return*/ ,
                                                {
                                                    value: Promise.reject(this_1.customErrorForResponse(response, (_b = response.data) === null || _b === void 0 ? void 0 : _b.message, requestOptions.data))
                                                }
                                            ];
                                        } else {
                                            // Retry all other HTTP errors (HTTPStatus > 500)
                                            // This will get caught by the catch block below
                                            throw this_1.customErrorForResponse(response, (_c = response.data) === null || _c === void 0 ? void 0 : _c.message, requestOptions.data);
                                        }
                                        return [
                                            3 /*break*/ ,
                                            6
                                        ];
                                    case 3:
                                        error_1 = _q.sent();
                                        // This block handles retries for HTTPStatus > 500 and network layer issues like connection timeouts
                                        if (!wasAborted) {
                                            this_1.setNodeHealthcheck(node, UNHEALTHY);
                                        }
                                        lastException = error_1;
                                        this_1.logger.warn("Request #".concat(requestNumber, ": Request to Node ").concat(node.index, " failed due to \"").concat((_d = error_1 === null || error_1 === void 0 ? void 0 : error_1.code) !== null && _d !== void 0 ? _d : "", " ").concat(error_1.message).concat(error_1.response == null ? "" : " - " + JSON.stringify((_e = error_1.response) === null || _e === void 0 ? void 0 : _e.data), "\""));
                                        if (wasAborted) {
                                            return [
                                                2 /*return*/ ,
                                                {
                                                    value: Promise.reject(new Error("Request aborted by caller."))
                                                }
                                            ];
                                        }
                                        if (isStreamingRequest) {
                                            this_1.invokeOnErrorCallback(error_1, streamConfig);
                                        }
                                        if (numTries < this_1.numRetriesPerRequest + 1) {
                                            this_1.logger.warn("Request #".concat(requestNumber, ": Sleeping for ").concat(this_1.retryIntervalSeconds, "s and then retrying request..."));
                                        } else {
                                            this_1.logger.debug("Request #".concat(requestNumber, ": No retries left. Raising last error"));
                                            return [
                                                2 /*return*/ ,
                                                {
                                                    value: Promise.reject(lastException)
                                                }
                                            ];
                                        }
                                        return [
                                            4 /*yield*/ ,
                                            this_1.timer(this_1.retryIntervalSeconds)
                                        ];
                                    case 4:
                                        _q.sent();
                                        return [
                                            3 /*break*/ ,
                                            6
                                        ];
                                    case 5:
                                        if (abortSignal && abortListener) {
                                            abortSignal.removeEventListener("abort", abortListener);
                                        }
                                        return [
                                            7 /*endfinally*/ 
                                        ];
                                    case 6:
                                        return [
                                            2 /*return*/ 
                                        ];
                                }
                            });
                        };
                        this_1 = this;
                        numTries = 1;
                        _p.label = 1;
                    case 1:
                        if (!(numTries <= this.numRetriesPerRequest + 1)) return [
                            3 /*break*/ ,
                            4
                        ];
                        return [
                            5 /*yield**/ ,
                            _loop_1(numTries)
                        ];
                    case 2:
                        state_1 = _p.sent();
                        if (typeof state_1 === "object") return [
                            2 /*return*/ ,
                            state_1.value
                        ];
                        _p.label = 3;
                    case 3:
                        numTries++;
                        return [
                            3 /*break*/ ,
                            1
                        ];
                    case 4:
                        this.logger.debug("Request #".concat(requestNumber, ": No retries left. Raising last error"));
                        return [
                            2 /*return*/ ,
                            Promise.reject(lastException)
                        ];
                }
            });
        });
    };
    ApiCall.prototype.processStreamingLine = function(line) {
        if (!line.trim() || line === "data: [DONE]") {
            return null;
        }
        // Handle SSE format (data: {...})
        if (line.startsWith("data: ")) {
            return this.processDataLine(line.slice(6).trim());
        }
        // Try parsing as JSON if it starts with a brace
        if (line.trim().startsWith("{")) {
            try {
                var jsonData = JSON.parse(line.trim());
                if (jsonData && typeof jsonData === "object") {
                    if (!jsonData.conversation_id) {
                        jsonData.conversation_id = "unknown";
                    }
                    if (!jsonData.message && jsonData.message !== "") {
                        jsonData.message = "";
                    }
                    return jsonData;
                }
                return {
                    conversation_id: "unknown",
                    message: JSON.stringify(jsonData)
                };
            } catch (e) {
                return {
                    conversation_id: "unknown",
                    message: line.trim()
                };
            }
        }
        return {
            conversation_id: "unknown",
            message: line.trim()
        };
    };
    ApiCall.prototype.processDataLine = function(dataContent) {
        if (!dataContent) {
            return null;
        }
        if (dataContent.startsWith("{")) {
            try {
                var jsonData = JSON.parse(dataContent);
                // Ensure the required fields exist
                if (jsonData && typeof jsonData === "object") {
                    if (!jsonData.conversation_id) {
                        jsonData.conversation_id = "unknown";
                    }
                    if (!jsonData.message && jsonData.message !== "") {
                        jsonData.message = "";
                    }
                    return jsonData;
                }
                return {
                    conversation_id: "unknown",
                    message: JSON.stringify(jsonData)
                };
            } catch (e) {
                // Not valid JSON, use as plain text
                return {
                    conversation_id: "unknown",
                    message: dataContent
                };
            }
        }
        // For plain text
        return {
            conversation_id: "unknown",
            message: dataContent
        };
    };
    ApiCall.prototype.handleStreamingResponse = function(response, streamConfig) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                this.logger.debug("Handling streaming response. Environment: ".concat(isNodeJSEnvironment ? "Node.js" : "Browser"));
                if (isNodeJSEnvironment && response.data) {
                    return [
                        2 /*return*/ ,
                        this.handleNodeStreaming(response, streamConfig)
                    ];
                }
                if (!isNodeJSEnvironment) {
                    return [
                        2 /*return*/ ,
                        this.handleBrowserStreaming(response, streamConfig)
                    ];
                }
                this.logger.debug("Processing non-streaming response");
                this.invokeOnCompleteCallback(response.data, streamConfig);
                return [
                    2 /*return*/ ,
                    Promise.resolve(response.data)
                ];
            });
        });
    };
    ApiCall.prototype.handleNodeStreaming = function(response, streamConfig) {
        var _this = this;
        this.logger.debug("Processing Node.js stream");
        return new Promise(function(resolve, reject) {
            var stream = response.data;
            var allChunks = [];
            var buffer = "";
            stream.on("data", function(chunk) {
                var _a;
                try {
                    var data = chunk.toString();
                    buffer += data;
                    var lines = buffer.split("\n");
                    buffer = (_a = lines.pop()) !== null && _a !== void 0 ? _a : "";
                    _this.processStreamLines(lines, allChunks, streamConfig);
                } catch (error) {
                    reject(error);
                }
            });
            stream.on("end", function() {
                if (buffer.trim().length > 0) {
                    var lines = buffer.split("\n");
                    _this.processStreamLines(lines, allChunks, streamConfig);
                }
                _this.finalizeStreamResult(allChunks, resolve, response, streamConfig);
            });
            stream.on("error", function(error) {
                _this.logger.error("Stream error: ".concat(error));
                _this.invokeOnErrorCallback(error, streamConfig);
                reject(error);
            });
        });
    };
    ApiCall.prototype.handleBrowserStreaming = function(response, streamConfig) {
        var _this = this;
        this.logger.debug("Processing browser stream");
        return new Promise(function(resolve, reject) {
            return tslib_1.__awaiter(_this, void 0, void 0, function() {
                return tslib_1.__generator(this, function(_a) {
                    try {
                        if (response.data && typeof response.data.getReader === "function") {
                            return [
                                2 /*return*/ ,
                                this.handleBrowserReadableStream(response.data, resolve, reject, response, streamConfig)
                            ];
                        }
                        if (typeof response.data === "string") {
                            return [
                                2 /*return*/ ,
                                this.handleBrowserStringResponse(response.data, resolve, response, streamConfig)
                            ];
                        }
                        if (typeof response.data === "object" && response.data !== null) {
                            this.logger.debug("No stream found, but data object is available");
                            this.invokeOnCompleteCallback(response.data, streamConfig);
                            return [
                                2 /*return*/ ,
                                resolve(response.data)
                            ];
                        }
                        this.logger.error("No usable data found in response");
                        return [
                            2 /*return*/ ,
                            reject(new Error("No usable data found in response"))
                        ];
                    } catch (error) {
                        this.logger.error("Error processing streaming response: ".concat(error));
                        this.invokeOnErrorCallback(error, streamConfig);
                        reject(error);
                    }
                    return [
                        2 /*return*/ 
                    ];
                });
            });
        });
    };
    ApiCall.prototype.handleBrowserReadableStream = function(stream, resolve, reject, response, streamConfig) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            var reader, allChunks, buffer, _a, done, value, lines_1, chunk, lines, error_2;
            return tslib_1.__generator(this, function(_b) {
                switch(_b.label){
                    case 0:
                        this.logger.debug("Found ReadableStream in response.data");
                        reader = stream.getReader();
                        allChunks = [];
                        buffer = "";
                        _b.label = 1;
                    case 1:
                        _b.trys.push([
                            1,
                            5,
                            ,
                            6
                        ]);
                        _b.label = 2;
                    case 2:
                        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                        ;
                        return [
                            4 /*yield*/ ,
                            reader.read()
                        ];
                    case 3:
                        _a = _b.sent(), done = _a.done, value = _a.value;
                        if (done) {
                            this.logger.debug("Stream reading complete");
                            if (buffer.trim()) {
                                lines_1 = buffer.split("\n");
                                this.processStreamLines(lines_1, allChunks, streamConfig);
                            }
                            return [
                                3 /*break*/ ,
                                4
                            ];
                        }
                        chunk = new TextDecoder().decode(value);
                        this.logger.debug("Received chunk: ".concat(chunk.length, " bytes"));
                        buffer += chunk;
                        lines = buffer.split("\n");
                        buffer = lines.pop() || "";
                        this.processStreamLines(lines, allChunks, streamConfig);
                        return [
                            3 /*break*/ ,
                            2
                        ];
                    case 4:
                        this.finalizeStreamResult(allChunks, resolve, response, streamConfig);
                        return [
                            3 /*break*/ ,
                            6
                        ];
                    case 5:
                        error_2 = _b.sent();
                        this.logger.error("Stream error: ".concat(error_2));
                        this.invokeOnErrorCallback(error_2, streamConfig);
                        reject(error_2);
                        return [
                            3 /*break*/ ,
                            6
                        ];
                    case 6:
                        return [
                            2 /*return*/ 
                        ];
                }
            });
        });
    };
    ApiCall.prototype.handleBrowserStringResponse = function(data, resolve, response, streamConfig) {
        this.logger.debug("Processing text response as stream data");
        var allChunks = [];
        var lines = data.split("\n");
        this.processStreamLines(lines, allChunks, streamConfig);
        if (allChunks.length > 0) {
            var finalResult = this.combineStreamingChunks(allChunks);
            this.invokeOnCompleteCallback(finalResult, streamConfig);
            resolve(finalResult);
        } else {
            // If no chunks were processed, use the original response
            this.logger.debug("No chunks processed, returning original API response");
            this.invokeOnCompleteCallback(response.data, streamConfig);
            resolve(response.data);
        }
    };
    ApiCall.prototype.processStreamLines = function(lines, allChunks, streamConfig) {
        for(var _i = 0, lines_2 = lines; _i < lines_2.length; _i++){
            var line = lines_2[_i];
            if (line.trim() && line !== "data: [DONE]") {
                var processed = this.processStreamingLine(line);
                if (processed !== null) {
                    this.invokeOnChunkCallback(processed, streamConfig);
                    allChunks.push(processed);
                }
            }
        }
    };
    ApiCall.prototype.finalizeStreamResult = function(allChunks, resolve, response, streamConfig) {
        if (allChunks.length > 0) {
            var finalResult = this.combineStreamingChunks(allChunks);
            this.logger.debug("Stream processing complete");
            this.invokeOnCompleteCallback(finalResult, streamConfig);
            resolve(finalResult);
        } else {
            this.logger.debug("No chunks processed, returning original API response");
            this.invokeOnCompleteCallback(response.data, streamConfig);
            resolve(response.data);
        }
    };
    /**
     * Combines multiple streaming chunks into a single coherent result
     * This is critical for ensuring we return the complete data rather than just the last chunk
     */ ApiCall.prototype.combineStreamingChunks = function(chunks) {
        if (chunks.length === 0) return {};
        if (chunks.length === 1) return chunks[0];
        // For conversation streams with message chunks
        var messagesChunks = this.getMessageChunks(chunks);
        if (messagesChunks.length > 0) {
            return this.combineMessageChunks(chunks, messagesChunks);
        }
        // For regular search responses
        var lastChunk = chunks[chunks.length - 1];
        if (!this.isCompleteSearchResponse(lastChunk)) {
            throw new Error("Last chunk is not a complete search response");
        }
        return lastChunk;
    };
    ApiCall.prototype.getMessageChunks = function(chunks) {
        return chunks.filter(this.isChunkMessage);
    };
    ApiCall.prototype.isChunkMessage = function(chunk) {
        return typeof chunk === "object" && chunk !== null && "message" in chunk && "conversation_id" in chunk;
    };
    ApiCall.prototype.combineMessageChunks = function(chunks, messagesChunks) {
        this.logger.debug("Found ".concat(messagesChunks.length, " message chunks to combine"));
        var lastChunk = chunks[chunks.length - 1];
        if (this.isCompleteSearchResponse(lastChunk)) {
            return lastChunk;
        }
        var metadataChunk = chunks.find(this.isCompleteSearchResponse);
        if (!metadataChunk) {
            throw new Error("No metadata chunk found");
        }
        return metadataChunk;
    };
    ApiCall.prototype.isCompleteSearchResponse = function(chunk) {
        if (typeof chunk === "object" && chunk !== null && Object.keys(chunk).length > 0) {
            return "results" in chunk || "found" in chunk || "hits" in chunk || "page" in chunk || "search_time_ms" in chunk;
        }
        return false;
    };
    // Attempts to find the next healthy node, looping through the list of nodes once.
    //   But if no healthy nodes are found, it will just return the next node, even if it's unhealthy
    //     so we can try the request for good measure, in case that node has become healthy since
    ApiCall.prototype.getNextNode = function(requestNumber) {
        if (requestNumber === void 0) {
            requestNumber = 0;
        }
        // Check if nearestNode is set and is healthy, if so return it
        if (this.nearestNode != null) {
            this.logger.debug("Request #".concat(requestNumber, ": Nodes Health: Node ").concat(this.nearestNode.index, " is ").concat(this.nearestNode.isHealthy === true ? "Healthy" : "Unhealthy"));
            if (this.nearestNode.isHealthy === true || this.nodeDueForHealthcheck(this.nearestNode, requestNumber)) {
                this.logger.debug("Request #".concat(requestNumber, ": Updated current node to Node ").concat(this.nearestNode.index));
                return this.nearestNode;
            }
            this.logger.debug("Request #".concat(requestNumber, ": Falling back to individual nodes"));
        }
        // Fallback to nodes as usual
        this.logger.debug("Request #".concat(requestNumber, ": Nodes Health: ").concat(this.nodes.map(function(node) {
            return "Node ".concat(node.index, " is ").concat(node.isHealthy === true ? "Healthy" : "Unhealthy");
        }).join(" || ")));
        var candidateNode = this.nodes[0];
        for(var i = 0; i <= this.nodes.length; i++){
            this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
            candidateNode = this.nodes[this.currentNodeIndex];
            if (candidateNode.isHealthy === true || this.nodeDueForHealthcheck(candidateNode, requestNumber)) {
                this.logger.debug("Request #".concat(requestNumber, ": Updated current node to Node ").concat(candidateNode.index));
                return candidateNode;
            }
        }
        // None of the nodes are marked healthy, but some of them could have become healthy since last health check.
        //  So we will just return the next node.
        this.logger.debug("Request #".concat(requestNumber, ": No healthy nodes were found. Returning the next node, Node ").concat(candidateNode.index));
        return candidateNode;
    };
    ApiCall.prototype.nodeDueForHealthcheck = function(node, requestNumber) {
        if (requestNumber === void 0) {
            requestNumber = 0;
        }
        var isDueForHealthcheck = Date.now() - node.lastAccessTimestamp > this.healthcheckIntervalSeconds * 1000;
        if (isDueForHealthcheck) {
            this.logger.debug("Request #".concat(requestNumber, ": Node ").concat(node.index, " has exceeded healtcheckIntervalSeconds of ").concat(this.healthcheckIntervalSeconds, ". Adding it back into rotation."));
        }
        return isDueForHealthcheck;
    };
    ApiCall.prototype.initializeMetadataForNodes = function() {
        var _this = this;
        if (this.nearestNode != null) {
            this.nearestNode.index = "nearestNode";
            this.setNodeHealthcheck(this.nearestNode, HEALTHY);
        }
        this.nodes.forEach(function(node, i) {
            node.index = i;
            _this.setNodeHealthcheck(node, HEALTHY);
        });
    };
    ApiCall.prototype.setNodeHealthcheck = function(node, isHealthy) {
        node.isHealthy = isHealthy;
        node.lastAccessTimestamp = Date.now();
    };
    ApiCall.prototype.uriFor = function(endpoint, node) {
        if (node.url != null) {
            return "".concat(node.url).concat(endpoint);
        }
        return "".concat(node.protocol, "://").concat(node.host, ":").concat(node.port).concat(node.path).concat(endpoint);
    };
    ApiCall.prototype.defaultHeaders = function() {
        var defaultHeaders = {};
        if (!this.sendApiKeyAsQueryParam) {
            defaultHeaders[APIKEYHEADERNAME] = this.apiKey;
        }
        defaultHeaders["Content-Type"] = "application/json";
        return defaultHeaders;
    };
    ApiCall.prototype.timer = function(seconds) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    new Promise(function(resolve) {
                        return setTimeout(resolve, seconds * 1000);
                    })
                ];
            });
        });
    };
    ApiCall.prototype.customErrorForResponse = function(response, messageFromServer, httpBody) {
        var errorMessage = "Request failed with HTTP code ".concat(response.status);
        if (typeof messageFromServer === "string" && messageFromServer.trim() !== "") {
            errorMessage += " | Server said: ".concat(messageFromServer);
        }
        var error = new TypesenseError_1.default(errorMessage, httpBody, response.status);
        if (response.status === 400) {
            error = new Errors_1.RequestMalformed(errorMessage, httpBody, response.status);
        } else if (response.status === 401) {
            error = new Errors_1.RequestUnauthorized(errorMessage, httpBody, response.status);
        } else if (response.status === 404) {
            error = new Errors_1.ObjectNotFound(errorMessage, httpBody, response.status);
        } else if (response.status === 409) {
            error = new Errors_1.ObjectAlreadyExists(errorMessage, httpBody, response.status);
        } else if (response.status === 422) {
            error = new Errors_1.ObjectUnprocessable(errorMessage, httpBody, response.status);
        } else if (response.status >= 500 && response.status <= 599) {
            error = new Errors_1.ServerError(errorMessage, httpBody, response.status);
        } else {
            error = new Errors_1.HTTPError(errorMessage, httpBody, response.status);
        }
        return error;
    };
    ApiCall.prototype.invokeOnChunkCallback = function(data, streamConfig) {
        if (streamConfig === null || streamConfig === void 0 ? void 0 : streamConfig.onChunk) {
            try {
                streamConfig.onChunk(data);
            } catch (error) {
                this.logger.warn("Error in onChunk callback: ".concat(error));
            }
        }
    };
    ApiCall.prototype.invokeOnCompleteCallback = function(data, streamConfig) {
        if (streamConfig === null || streamConfig === void 0 ? void 0 : streamConfig.onComplete) {
            try {
                streamConfig.onComplete(data);
            } catch (error) {
                this.logger.warn("Error in onComplete callback: ".concat(error));
            }
        }
    };
    ApiCall.prototype.invokeOnErrorCallback = function(error, streamConfig) {
        if (streamConfig === null || streamConfig === void 0 ? void 0 : streamConfig.onError) {
            var errorObj = (0, Utils_1.toErrorWithMessage)(error);
            try {
                streamConfig.onError(errorObj);
            } catch (callbackError) {
                this.logger.warn("Error in onError callback: ".concat(callbackError));
            }
        }
    };
    return ApiCall;
}();
exports.default = ApiCall; //# sourceMappingURL=ApiCall.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Collections.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RESOURCEPATH = "/collections";
var Collections = function() {
    function Collections(apiCall) {
        this.apiCall = apiCall;
    }
    Collections.prototype.create = function(schema, options) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.post(RESOURCEPATH, schema, options)
                ];
            });
        });
    };
    Collections.prototype.retrieve = function(options) {
        if (options === void 0) {
            options = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(RESOURCEPATH, options)
                ];
            });
        });
    };
    Object.defineProperty(Collections, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return Collections;
}();
exports.default = Collections; //# sourceMappingURL=Collections.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/RequestWithCache.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var defaultCacheResponseForSeconds = 2 * 60;
var defaultMaxSize = 100;
var RequestWithCache = function() {
    function RequestWithCache() {
        this.responseCache = new Map();
        this.responsePromiseCache = new Map();
    }
    RequestWithCache.prototype.clearCache = function() {
        this.responseCache = new Map();
        this.responsePromiseCache = new Map();
    };
    RequestWithCache.prototype.perform = function(requestContext, methodName, requestParams, cacheOptions) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            var _a, _b, cacheResponseForSeconds, _c, maxSize, isCacheDisabled, path, queryParams, body, headers, streamConfig, abortSignal, responseType, isStreamingRequest, requestParamsJSON, cacheEntry, now, isEntryValid, cachePromiseEntry, isEntryValid, responsePromise, response, isCacheOverMaxSize, oldestEntry, isResponsePromiseCacheOverMaxSize, oldestEntry;
            return tslib_1.__generator(this, function(_d) {
                switch(_d.label){
                    case 0:
                        _a = cacheOptions || {}, _b = _a.cacheResponseForSeconds, cacheResponseForSeconds = _b === void 0 ? defaultCacheResponseForSeconds : _b, _c = _a.maxSize, maxSize = _c === void 0 ? defaultMaxSize : _c;
                        isCacheDisabled = cacheOptions === undefined || cacheResponseForSeconds <= 0 || maxSize <= 0;
                        path = requestParams.path, queryParams = requestParams.queryParams, body = requestParams.body, headers = requestParams.headers, streamConfig = requestParams.streamConfig, abortSignal = requestParams.abortSignal, responseType = requestParams.responseType, isStreamingRequest = requestParams.isStreamingRequest;
                        if (isCacheDisabled) {
                            return [
                                2 /*return*/ ,
                                this.executeRequest(requestContext, methodName, path, queryParams, body, headers, {
                                    abortSignal: abortSignal,
                                    responseType: responseType,
                                    streamConfig: streamConfig,
                                    isStreamingRequest: isStreamingRequest
                                })
                            ];
                        }
                        requestParamsJSON = JSON.stringify(requestParams);
                        cacheEntry = this.responseCache.get(requestParamsJSON);
                        now = Date.now();
                        if (cacheEntry) {
                            isEntryValid = now - cacheEntry.requestTimestamp < cacheResponseForSeconds * 1000;
                            if (isEntryValid) {
                                this.responseCache.delete(requestParamsJSON);
                                this.responseCache.set(requestParamsJSON, cacheEntry);
                                return [
                                    2 /*return*/ ,
                                    cacheEntry.response
                                ];
                            } else {
                                this.responseCache.delete(requestParamsJSON);
                            }
                        }
                        cachePromiseEntry = this.responsePromiseCache.get(requestParamsJSON);
                        if (cachePromiseEntry) {
                            isEntryValid = now - cachePromiseEntry.requestTimestamp < cacheResponseForSeconds * 1000;
                            if (isEntryValid) {
                                this.responsePromiseCache.delete(requestParamsJSON);
                                this.responsePromiseCache.set(requestParamsJSON, cachePromiseEntry);
                                return [
                                    2 /*return*/ ,
                                    cachePromiseEntry.responsePromise
                                ];
                            } else {
                                this.responsePromiseCache.delete(requestParamsJSON);
                            }
                        }
                        responsePromise = this.executeRequest(requestContext, methodName, path, queryParams, body, headers, {
                            abortSignal: abortSignal,
                            responseType: responseType,
                            streamConfig: streamConfig,
                            isStreamingRequest: isStreamingRequest
                        });
                        this.responsePromiseCache.set(requestParamsJSON, {
                            requestTimestamp: now,
                            responsePromise: responsePromise
                        });
                        return [
                            4 /*yield*/ ,
                            responsePromise
                        ];
                    case 1:
                        response = _d.sent();
                        this.responseCache.set(requestParamsJSON, {
                            requestTimestamp: now,
                            response: response
                        });
                        isCacheOverMaxSize = this.responseCache.size > maxSize;
                        if (isCacheOverMaxSize) {
                            oldestEntry = this.responseCache.keys().next().value;
                            if (oldestEntry) {
                                this.responseCache.delete(oldestEntry);
                            }
                        }
                        isResponsePromiseCacheOverMaxSize = this.responsePromiseCache.size > maxSize;
                        if (isResponsePromiseCacheOverMaxSize) {
                            oldestEntry = this.responsePromiseCache.keys().next().value;
                            if (oldestEntry) {
                                this.responsePromiseCache.delete(oldestEntry);
                            }
                        }
                        return [
                            2 /*return*/ ,
                            response
                        ];
                }
            });
        });
    };
    RequestWithCache.prototype.executeRequest = function(context, methodName, path, queryParams, body, headers, options) {
        if (queryParams === void 0) {
            queryParams = {};
        }
        var method = context[methodName];
        switch(methodName){
            case "get":
                return method.call(context, path, queryParams, {
                    abortSignal: options === null || options === void 0 ? void 0 : options.abortSignal,
                    responseType: options === null || options === void 0 ? void 0 : options.responseType,
                    streamConfig: options === null || options === void 0 ? void 0 : options.streamConfig,
                    isStreamingRequest: options === null || options === void 0 ? void 0 : options.isStreamingRequest
                });
            case "delete":
                return method.call(context, path, queryParams);
            case "post":
                return method.call(context, path, body, queryParams, headers || {}, {
                    abortSignal: options === null || options === void 0 ? void 0 : options.abortSignal,
                    responseType: options === null || options === void 0 ? void 0 : options.responseType,
                    streamConfig: options === null || options === void 0 ? void 0 : options.streamConfig,
                    isStreamingRequest: options === null || options === void 0 ? void 0 : options.isStreamingRequest
                });
            case "put":
            case "patch":
                return method.call(context, path, body, queryParams);
            default:
                throw new Error("Unsupported method: ".concat(String(methodName)));
        }
    };
    return RequestWithCache;
}();
exports.default = RequestWithCache; //# sourceMappingURL=RequestWithCache.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/SearchOnlyDocuments.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.SearchOnlyDocuments = void 0;
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RequestWithCache_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/RequestWithCache.js [app-route] (ecmascript)"));
var Collections_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Collections.js [app-route] (ecmascript)"));
var Utils_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Utils.js [app-route] (ecmascript)");
var RESOURCEPATH = "/documents";
var SearchOnlyDocuments = function() {
    function SearchOnlyDocuments(collectionName, apiCall, configuration) {
        this.collectionName = collectionName;
        this.apiCall = apiCall;
        this.configuration = configuration;
        this.requestWithCache = new RequestWithCache_1.default();
    }
    SearchOnlyDocuments.prototype.clearCache = function() {
        this.requestWithCache.clearCache();
    };
    SearchOnlyDocuments.prototype.search = function(searchParameters, _a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.cacheSearchResultsForSeconds, cacheSearchResultsForSeconds = _c === void 0 ? this.configuration.cacheSearchResultsForSeconds : _c, _d = _b.abortSignal, abortSignal = _d === void 0 ? null : _d;
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            var additionalQueryParams, _e, streamConfig, rest, queryParams, isStreamingRequest;
            return tslib_1.__generator(this, function(_f) {
                additionalQueryParams = {};
                if (this.configuration.useServerSideSearchCache === true) {
                    additionalQueryParams["use_cache"] = true;
                }
                _e = (0, Utils_1.normalizeArrayableParams)(searchParameters), streamConfig = _e.streamConfig, rest = tslib_1.__rest(_e, [
                    "streamConfig"
                ]);
                queryParams = tslib_1.__assign(tslib_1.__assign({}, additionalQueryParams), rest);
                isStreamingRequest = queryParams.conversation_stream === true;
                return [
                    2 /*return*/ ,
                    this.requestWithCache.perform(this.apiCall, "get", {
                        path: this.endpointPath("search"),
                        queryParams: queryParams,
                        streamConfig: streamConfig,
                        abortSignal: abortSignal,
                        isStreamingRequest: isStreamingRequest
                    }, {
                        cacheResponseForSeconds: cacheSearchResultsForSeconds
                    })
                ];
            });
        });
    };
    SearchOnlyDocuments.prototype.endpointPath = function(operation) {
        return "".concat(Collections_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.collectionName)).concat(RESOURCEPATH).concat(operation === undefined ? "" : "/" + operation);
    };
    Object.defineProperty(SearchOnlyDocuments, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return SearchOnlyDocuments;
}();
exports.SearchOnlyDocuments = SearchOnlyDocuments; //# sourceMappingURL=SearchOnlyDocuments.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Documents.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Errors_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/index.js [app-route] (ecmascript)");
var SearchOnlyDocuments_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/SearchOnlyDocuments.js [app-route] (ecmascript)");
var isNodeJSEnvironment = typeof process !== "undefined" && process.versions != null && process.versions.node != null;
var Documents = function(_super) {
    tslib_1.__extends(Documents, _super);
    function Documents(collectionName, apiCall, configuration) {
        return _super.call(this, collectionName, apiCall, configuration) || this;
    }
    Documents.prototype.create = function(document, options) {
        if (options === void 0) {
            options = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                if (!document) throw new Error("No document provided");
                return [
                    2 /*return*/ ,
                    this.apiCall.post(this.endpointPath(), document, options)
                ];
            });
        });
    };
    Documents.prototype.upsert = function(document, options) {
        if (options === void 0) {
            options = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                if (!document) throw new Error("No document provided");
                return [
                    2 /*return*/ ,
                    this.apiCall.post(this.endpointPath(), document, Object.assign({}, options, {
                        action: "upsert"
                    }))
                ];
            });
        });
    };
    Documents.prototype.update = function(document, options) {
        if (options === void 0) {
            options = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                if (!document) throw new Error("No document provided");
                if (options["filter_by"] != null) {
                    return [
                        2 /*return*/ ,
                        this.apiCall.patch(this.endpointPath(), document, Object.assign({}, options))
                    ];
                } else {
                    return [
                        2 /*return*/ ,
                        this.apiCall.post(this.endpointPath(), document, Object.assign({}, options, {
                            action: "update"
                        }))
                    ];
                }
                //TURBOPACK unreachable
                ;
            });
        });
    };
    Documents.prototype.delete = function(query) {
        if (query === void 0) {
            query = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.delete(this.endpointPath(), query)
                ];
            });
        });
    };
    Documents.prototype.createMany = function(documents, options) {
        if (options === void 0) {
            options = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                this.configuration.logger.warn("createMany is deprecated and will be removed in a future version. Use import instead, which now takes both an array of documents or a JSONL string of documents");
                return [
                    2 /*return*/ ,
                    this.import(documents, options)
                ];
            });
        });
    };
    Documents.prototype.import = function(documents, options) {
        if (options === void 0) {
            options = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            var finalOptions, documentsInJSONLFormat, resultsInJSONLFormat, resultsInJSONFormat, failedItems;
            return tslib_1.__generator(this, function(_a) {
                switch(_a.label){
                    case 0:
                        finalOptions = tslib_1.__assign({
                            throwOnFail: true
                        }, options);
                        if (Array.isArray(documents)) {
                            if (documents.length === 0) {
                                throw new Errors_1.RequestMalformed("No documents provided");
                            }
                            try {
                                documentsInJSONLFormat = documents.map(function(document) {
                                    return JSON.stringify(document);
                                }).join("\n");
                            } catch (error) {
                                // if rangeerror, throw custom error message
                                if (error instanceof RangeError && error.message.includes("Too many properties to enumerate")) {
                                    throw new Error("".concat(error, "\n          It looks like you have reached a Node.js limit that restricts the number of keys in an Object: https://stackoverflow.com/questions/9282869/are-there-limits-to-the-number-of-properties-in-a-javascript-object\n\n         Please try reducing the number of keys in your document, or using CURL to import your data.\n          "));
                                }
                                // else, throw the non-range error anyways
                                throw new Error(error);
                            }
                        } else {
                            documentsInJSONLFormat = documents;
                            if (isEmptyString(documentsInJSONLFormat)) {
                                throw new Errors_1.RequestMalformed("No documents provided");
                            }
                        }
                        return [
                            4 /*yield*/ ,
                            this.apiCall.performRequest("post", this.endpointPath("import"), {
                                queryParameters: finalOptions,
                                bodyParameters: documentsInJSONLFormat,
                                additionalHeaders: {
                                    "Content-Type": "text/plain"
                                },
                                skipConnectionTimeout: true,
                                enableKeepAlive: isNodeJSEnvironment ? true : false
                            })
                        ];
                    case 1:
                        resultsInJSONLFormat = _a.sent();
                        if (Array.isArray(documents)) {
                            resultsInJSONFormat = resultsInJSONLFormat.split("\n").map(function(r) {
                                return JSON.parse(r);
                            });
                            failedItems = resultsInJSONFormat.filter(function(r) {
                                return r.success === false;
                            });
                            if (failedItems.length > 0 && finalOptions.throwOnFail) {
                                throw new Errors_1.ImportError("".concat(resultsInJSONFormat.length - failedItems.length, " documents imported successfully, ").concat(failedItems.length, " documents failed during import. Use `error.importResults` from the raised exception to get a detailed error reason for each document."), resultsInJSONFormat, {
                                    documentsInJSONLFormat: documentsInJSONLFormat,
                                    options: finalOptions,
                                    failedItems: failedItems,
                                    successCount: resultsInJSONFormat.length - failedItems.length
                                });
                            } else {
                                return [
                                    2 /*return*/ ,
                                    resultsInJSONFormat
                                ];
                            }
                        } else {
                            return [
                                2 /*return*/ ,
                                resultsInJSONLFormat
                            ];
                        }
                        return [
                            2 /*return*/ 
                        ];
                }
            });
        });
    };
    /**
     * Imports documents from a NodeJS readable stream of JSONL.
     */ Documents.prototype.importStream = function(readableStream, options) {
        if (options === void 0) {
            options = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            var finalOptions, resultsInJSONLFormat, resultsInJSONFormat, failedItems;
            return tslib_1.__generator(this, function(_a) {
                switch(_a.label){
                    case 0:
                        finalOptions = tslib_1.__assign({
                            throwOnFail: true
                        }, options);
                        return [
                            4 /*yield*/ ,
                            this.apiCall.performRequest("post", this.endpointPath("import"), {
                                queryParameters: finalOptions,
                                bodyParameters: readableStream,
                                additionalHeaders: {
                                    "Content-Type": "text/plain"
                                },
                                skipConnectionTimeout: true,
                                enableKeepAlive: isNodeJSEnvironment ? true : false
                            })
                        ];
                    case 1:
                        resultsInJSONLFormat = _a.sent();
                        resultsInJSONFormat = resultsInJSONLFormat.split("\n").map(function(r) {
                            return JSON.parse(r);
                        });
                        failedItems = resultsInJSONFormat.filter(function(r) {
                            return r.success === false;
                        });
                        if (failedItems.length > 0 && finalOptions.throwOnFail) {
                            throw new Errors_1.ImportError("".concat(resultsInJSONFormat.length - failedItems.length, " documents imported successfully, ").concat(failedItems.length, " documents failed during import. Use `error.importResults` from the raised exception to get a detailed error reason for each document."), resultsInJSONFormat, {
                                documentsInJSONLFormat: readableStream,
                                options: finalOptions,
                                failedItems: failedItems,
                                successCount: resultsInJSONFormat.length - failedItems.length
                            });
                        } else {
                            return [
                                2 /*return*/ ,
                                resultsInJSONFormat
                            ];
                        }
                        return [
                            2 /*return*/ 
                        ];
                }
            });
        });
    };
    /**
     * Returns a JSONL string for all the documents in this collection
     */ Documents.prototype.export = function(options) {
        if (options === void 0) {
            options = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath("export"), options)
                ];
            });
        });
    };
    /**
     * Returns a NodeJS readable stream of JSONL for all the documents in this collection.
     */ Documents.prototype.exportStream = function(options) {
        if (options === void 0) {
            options = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath("export"), options, {
                        responseType: "stream"
                    })
                ];
            });
        });
    };
    return Documents;
}(SearchOnlyDocuments_1.SearchOnlyDocuments);
exports.default = Documents;
function isEmptyString(str) {
    return str == null || str === "" || str.length === 0;
} //# sourceMappingURL=Documents.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Overrides.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Collections_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Collections.js [app-route] (ecmascript)"));
var RESOURCEPATH = "/overrides";
var Overrides = function() {
    function Overrides(collectionName, apiCall) {
        this.collectionName = collectionName;
        this.apiCall = apiCall;
    }
    Overrides.prototype.upsert = function(overrideId, params) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.put(this.endpointPath(overrideId), params)
                ];
            });
        });
    };
    Overrides.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    Overrides.prototype.endpointPath = function(operation) {
        return "".concat(Collections_1.default.RESOURCEPATH, "/").concat(this.collectionName).concat(Overrides.RESOURCEPATH).concat(operation === undefined ? "" : "/" + encodeURIComponent(operation));
    };
    Object.defineProperty(Overrides, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return Overrides;
}();
exports.default = Overrides; //# sourceMappingURL=Overrides.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Override.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Collections_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Collections.js [app-route] (ecmascript)"));
var Overrides_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Overrides.js [app-route] (ecmascript)"));
var Override = function() {
    function Override(collectionName, overrideId, apiCall) {
        this.collectionName = collectionName;
        this.overrideId = overrideId;
        this.apiCall = apiCall;
    }
    Override.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    Override.prototype.delete = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.delete(this.endpointPath())
                ];
            });
        });
    };
    Override.prototype.endpointPath = function() {
        return "".concat(Collections_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.collectionName)).concat(Overrides_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.overrideId));
    };
    return Override;
}();
exports.default = Override; //# sourceMappingURL=Override.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Synonyms.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Collections_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Collections.js [app-route] (ecmascript)"));
var RESOURCEPATH = "/synonyms";
var Synonyms = function() {
    function Synonyms(collectionName, apiCall) {
        this.collectionName = collectionName;
        this.apiCall = apiCall;
    }
    Synonyms.prototype.upsert = function(synonymId, params) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.put(this.endpointPath(synonymId), params)
                ];
            });
        });
    };
    Synonyms.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    Synonyms.prototype.endpointPath = function(operation) {
        return "".concat(Collections_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.collectionName)).concat(Synonyms.RESOURCEPATH).concat(operation === undefined ? "" : "/" + encodeURIComponent(operation));
    };
    Object.defineProperty(Synonyms, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return Synonyms;
}();
exports.default = Synonyms; //# sourceMappingURL=Synonyms.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Synonym.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Collections_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Collections.js [app-route] (ecmascript)"));
var Synonyms_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Synonyms.js [app-route] (ecmascript)"));
var Synonym = function() {
    function Synonym(collectionName, synonymId, apiCall) {
        this.collectionName = collectionName;
        this.synonymId = synonymId;
        this.apiCall = apiCall;
    }
    Synonym.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    Synonym.prototype.delete = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.delete(this.endpointPath())
                ];
            });
        });
    };
    Synonym.prototype.endpointPath = function() {
        return "".concat(Collections_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.collectionName)).concat(Synonyms_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.synonymId));
    };
    return Synonym;
}();
exports.default = Synonym; //# sourceMappingURL=Synonym.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Document.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Document = void 0;
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Collections_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Collections.js [app-route] (ecmascript)"));
var Documents_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Documents.js [app-route] (ecmascript)"));
var Document = function() {
    function Document(collectionName, documentId, apiCall) {
        this.collectionName = collectionName;
        this.documentId = documentId;
        this.apiCall = apiCall;
    }
    Document.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    Document.prototype.delete = function(options) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.delete(this.endpointPath(), options)
                ];
            });
        });
    };
    Document.prototype.update = function(partialDocument, options) {
        if (options === void 0) {
            options = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.patch(this.endpointPath(), partialDocument, options)
                ];
            });
        });
    };
    Document.prototype.endpointPath = function() {
        return "".concat(Collections_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.collectionName)).concat(Documents_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.documentId));
    };
    return Document;
}();
exports.Document = Document; //# sourceMappingURL=Document.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Collection.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Collections_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Collections.js [app-route] (ecmascript)"));
var Documents_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Documents.js [app-route] (ecmascript)"));
var Errors_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/index.js [app-route] (ecmascript)");
var Overrides_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Overrides.js [app-route] (ecmascript)"));
var Override_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Override.js [app-route] (ecmascript)"));
var Synonyms_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Synonyms.js [app-route] (ecmascript)"));
var Synonym_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Synonym.js [app-route] (ecmascript)"));
var Document_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Document.js [app-route] (ecmascript)");
var Collection = function() {
    function Collection(name, apiCall, configuration) {
        this.name = name;
        this.apiCall = apiCall;
        this.configuration = configuration;
        this.individualDocuments = {};
        this.individualOverrides = {};
        this.individualSynonyms = {};
        this.name = name;
        this.apiCall = apiCall;
        this.configuration = configuration;
        this._documents = new Documents_1.default(this.name, this.apiCall, this.configuration);
        this._overrides = new Overrides_1.default(this.name, this.apiCall);
        this._synonyms = new Synonyms_1.default(this.name, this.apiCall);
    }
    Collection.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    Collection.prototype.update = function(schema) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.patch(this.endpointPath(), schema)
                ];
            });
        });
    };
    Collection.prototype.delete = function(options) {
        if (options === void 0) {
            options = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.delete(this.endpointPath(), options)
                ];
            });
        });
    };
    Collection.prototype.exists = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            var e_1;
            return tslib_1.__generator(this, function(_a) {
                switch(_a.label){
                    case 0:
                        _a.trys.push([
                            0,
                            2,
                            ,
                            3
                        ]);
                        return [
                            4 /*yield*/ ,
                            this.retrieve()
                        ];
                    case 1:
                        _a.sent();
                        return [
                            2 /*return*/ ,
                            true
                        ];
                    case 2:
                        e_1 = _a.sent();
                        if (e_1 instanceof Errors_1.ObjectNotFound) return [
                            2 /*return*/ ,
                            false
                        ];
                        throw e_1;
                    case 3:
                        return [
                            2 /*return*/ 
                        ];
                }
            });
        });
    };
    Collection.prototype.documents = function(documentId) {
        if (!documentId) {
            return this._documents;
        } else {
            if (this.individualDocuments[documentId] === undefined) {
                this.individualDocuments[documentId] = new Document_1.Document(this.name, documentId, this.apiCall);
            }
            return this.individualDocuments[documentId];
        }
    };
    Collection.prototype.overrides = function(overrideId) {
        if (overrideId === undefined) {
            return this._overrides;
        } else {
            if (this.individualOverrides[overrideId] === undefined) {
                this.individualOverrides[overrideId] = new Override_1.default(this.name, overrideId, this.apiCall);
            }
            return this.individualOverrides[overrideId];
        }
    };
    Collection.prototype.synonyms = function(synonymId) {
        if (synonymId === undefined) {
            return this._synonyms;
        } else {
            if (this.individualSynonyms[synonymId] === undefined) {
                this.individualSynonyms[synonymId] = new Synonym_1.default(this.name, synonymId, this.apiCall);
            }
            return this.individualSynonyms[synonymId];
        }
    };
    Collection.prototype.endpointPath = function() {
        return "".concat(Collections_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.name));
    };
    return Collection;
}();
exports.default = Collection; //# sourceMappingURL=Collection.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Aliases.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RESOURCEPATH = "/aliases";
var Aliases = function() {
    function Aliases(apiCall) {
        this.apiCall = apiCall;
    }
    Aliases.prototype.upsert = function(name, mapping) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.put(this.endpointPath(name), mapping)
                ];
            });
        });
    };
    Aliases.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(RESOURCEPATH)
                ];
            });
        });
    };
    Aliases.prototype.endpointPath = function(aliasName) {
        return "".concat(Aliases.RESOURCEPATH, "/").concat(encodeURIComponent(aliasName));
    };
    Object.defineProperty(Aliases, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return Aliases;
}();
exports.default = Aliases; //# sourceMappingURL=Aliases.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Alias.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Aliases_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Aliases.js [app-route] (ecmascript)"));
var Alias = function() {
    function Alias(name, apiCall) {
        this.name = name;
        this.apiCall = apiCall;
    }
    Alias.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    Alias.prototype.delete = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.delete(this.endpointPath())
                ];
            });
        });
    };
    Alias.prototype.endpointPath = function() {
        return "".concat(Aliases_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.name));
    };
    return Alias;
}();
exports.default = Alias; //# sourceMappingURL=Alias.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Keys.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var crypto_1 = __turbopack_context__.r("[externals]/crypto [external] (crypto, cjs)");
var Utils_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Utils.js [app-route] (ecmascript)");
var RESOURCEPATH = "/keys";
var Keys = function() {
    function Keys(apiCall) {
        this.apiCall = apiCall;
        this.apiCall = apiCall;
    }
    Keys.prototype.create = function(params) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.post(Keys.RESOURCEPATH, params)
                ];
            });
        });
    };
    Keys.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(RESOURCEPATH)
                ];
            });
        });
    };
    Keys.prototype.generateScopedSearchKey = function(searchKey, parameters) {
        // Note: only a key generated with the `documents:search` action will be
        // accepted by the server, when used with the search endpoint.
        var normalizedParams = (0, Utils_1.normalizeArrayableParams)(parameters);
        var paramsJSON = JSON.stringify(normalizedParams);
        var digest = Buffer.from((0, crypto_1.createHmac)("sha256", searchKey).update(paramsJSON).digest("base64"));
        var keyPrefix = searchKey.substr(0, 4);
        var rawScopedKey = "".concat(digest).concat(keyPrefix).concat(paramsJSON);
        return Buffer.from(rawScopedKey).toString("base64");
    };
    Object.defineProperty(Keys, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return Keys;
}();
exports.default = Keys; //# sourceMappingURL=Keys.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Key.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Keys_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Keys.js [app-route] (ecmascript)"));
var Key = function() {
    function Key(id, apiCall) {
        this.id = id;
        this.apiCall = apiCall;
    }
    Key.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    Key.prototype.delete = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.delete(this.endpointPath())
                ];
            });
        });
    };
    Key.prototype.endpointPath = function() {
        return "".concat(Keys_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.id));
    };
    return Key;
}();
exports.default = Key; //# sourceMappingURL=Key.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Debug.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RESOURCEPATH = "/debug";
var Debug = function() {
    function Debug(apiCall) {
        this.apiCall = apiCall;
    }
    Debug.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(RESOURCEPATH)
                ];
            });
        });
    };
    return Debug;
}();
exports.default = Debug; //# sourceMappingURL=Debug.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Metrics.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RESOURCEPATH = "/metrics.json";
var Metrics = function() {
    function Metrics(apiCall) {
        this.apiCall = apiCall;
    }
    Metrics.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(RESOURCEPATH)
                ];
            });
        });
    };
    return Metrics;
}();
exports.default = Metrics; //# sourceMappingURL=Metrics.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Stats.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RESOURCEPATH = "/stats.json";
var Metrics = function() {
    function Metrics(apiCall) {
        this.apiCall = apiCall;
    }
    Metrics.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(RESOURCEPATH)
                ];
            });
        });
    };
    return Metrics;
}();
exports.default = Metrics; //# sourceMappingURL=Stats.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Health.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RESOURCEPATH = "/health";
var Health = function() {
    function Health(apiCall) {
        this.apiCall = apiCall;
    }
    Health.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(RESOURCEPATH)
                ];
            });
        });
    };
    return Health;
}();
exports.default = Health; //# sourceMappingURL=Health.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Operations.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RESOURCEPATH = "/operations";
var Operations = function() {
    function Operations(apiCall) {
        this.apiCall = apiCall;
    }
    Operations.prototype.perform = function(operationName, queryParameters) {
        if (queryParameters === void 0) {
            queryParameters = {};
        }
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.post("".concat(RESOURCEPATH, "/").concat(operationName), {}, queryParameters)
                ];
            });
        });
    };
    return Operations;
}();
exports.default = Operations; //# sourceMappingURL=Operations.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/MultiSearch.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RequestWithCache_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/RequestWithCache.js [app-route] (ecmascript)"));
var Utils_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Utils.js [app-route] (ecmascript)");
var RESOURCEPATH = "/multi_search";
var MultiSearch = function() {
    function MultiSearch(apiCall, configuration, useTextContentType) {
        if (useTextContentType === void 0) {
            useTextContentType = false;
        }
        this.apiCall = apiCall;
        this.configuration = configuration;
        this.useTextContentType = useTextContentType;
        this.requestWithCache = new RequestWithCache_1.default();
    }
    MultiSearch.prototype.clearCache = function() {
        this.requestWithCache.clearCache();
    };
    MultiSearch.prototype.perform = function(searchRequests, commonParams, options) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            var params, normalizedSearchRequests, streamConfig, paramsWithoutStream, normalizedQueryParams;
            return tslib_1.__generator(this, function(_a) {
                params = commonParams ? tslib_1.__assign({}, commonParams) : {};
                if (this.configuration.useServerSideSearchCache === true) {
                    params.use_cache = true;
                }
                normalizedSearchRequests = {
                    union: searchRequests.union,
                    searches: searchRequests.searches.map(Utils_1.normalizeArrayableParams)
                };
                streamConfig = params.streamConfig, paramsWithoutStream = tslib_1.__rest(params, [
                    "streamConfig"
                ]);
                normalizedQueryParams = (0, Utils_1.normalizeArrayableParams)(paramsWithoutStream);
                return [
                    2 /*return*/ ,
                    this.requestWithCache.perform(this.apiCall, "post", {
                        path: RESOURCEPATH,
                        body: normalizedSearchRequests,
                        queryParams: normalizedQueryParams,
                        headers: this.useTextContentType ? {
                            "content-type": "text/plain"
                        } : {},
                        streamConfig: streamConfig,
                        abortSignal: options === null || options === void 0 ? void 0 : options.abortSignal,
                        isStreamingRequest: this.isStreamingRequest(params)
                    }, (options === null || options === void 0 ? void 0 : options.cacheSearchResultsForSeconds) !== undefined ? {
                        cacheResponseForSeconds: options.cacheSearchResultsForSeconds
                    } : undefined)
                ];
            });
        });
    };
    MultiSearch.prototype.isStreamingRequest = function(commonParams) {
        return commonParams.streamConfig !== undefined;
    };
    return MultiSearch;
}();
exports.default = MultiSearch; //# sourceMappingURL=MultiSearch.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Presets.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Utils_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Utils.js [app-route] (ecmascript)");
var RESOURCEPATH = "/presets";
var Presets = function() {
    function Presets(apiCall) {
        this.apiCall = apiCall;
    }
    Presets.prototype.upsert = function(presetId, params) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            var normalizedParams_1, normalizedParams;
            return tslib_1.__generator(this, function(_a) {
                if (typeof params.value === "object" && "searches" in params.value) {
                    normalizedParams_1 = params.value.searches.map(function(search) {
                        return (0, Utils_1.normalizeArrayableParams)(search);
                    });
                    return [
                        2 /*return*/ ,
                        this.apiCall.put(this.endpointPath(presetId), {
                            value: {
                                searches: normalizedParams_1
                            }
                        })
                    ];
                }
                normalizedParams = (0, Utils_1.normalizeArrayableParams)(params.value);
                return [
                    2 /*return*/ ,
                    this.apiCall.put(this.endpointPath(presetId), {
                        value: normalizedParams
                    })
                ];
            });
        });
    };
    Presets.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    Presets.prototype.endpointPath = function(operation) {
        return "".concat(Presets.RESOURCEPATH).concat(operation === undefined ? "" : "/" + encodeURIComponent(operation));
    };
    Object.defineProperty(Presets, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return Presets;
}();
exports.default = Presets; //# sourceMappingURL=Presets.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Preset.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Presets_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Presets.js [app-route] (ecmascript)"));
var Preset = function() {
    function Preset(presetId, apiCall) {
        this.presetId = presetId;
        this.apiCall = apiCall;
    }
    Preset.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    Preset.prototype.delete = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.delete(this.endpointPath())
                ];
            });
        });
    };
    Preset.prototype.endpointPath = function() {
        return "".concat(Presets_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.presetId));
    };
    return Preset;
}();
exports.default = Preset; //# sourceMappingURL=Preset.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/AnalyticsRules.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RESOURCEPATH = "/analytics/rules";
var AnalyticsRules = function() {
    function AnalyticsRules(apiCall) {
        this.apiCall = apiCall;
        this.apiCall = apiCall;
    }
    AnalyticsRules.prototype.upsert = function(name, params) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.put(this.endpointPath(name), params)
                ];
            });
        });
    };
    AnalyticsRules.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    AnalyticsRules.prototype.endpointPath = function(operation) {
        return "".concat(AnalyticsRules.RESOURCEPATH).concat(operation === undefined ? "" : "/" + encodeURIComponent(operation));
    };
    Object.defineProperty(AnalyticsRules, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return AnalyticsRules;
}();
exports.default = AnalyticsRules; //# sourceMappingURL=AnalyticsRules.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/AnalyticsRule.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var AnalyticsRules_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/AnalyticsRules.js [app-route] (ecmascript)"));
var AnalyticsRule = function() {
    function AnalyticsRule(name, apiCall) {
        this.name = name;
        this.apiCall = apiCall;
    }
    AnalyticsRule.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    AnalyticsRule.prototype.delete = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.delete(this.endpointPath())
                ];
            });
        });
    };
    AnalyticsRule.prototype.endpointPath = function() {
        return "".concat(AnalyticsRules_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.name));
    };
    return AnalyticsRule;
}();
exports.default = AnalyticsRule; //# sourceMappingURL=AnalyticsRule.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/AnalyticsEvents.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RESOURCEPATH = "/analytics/events";
var AnalyticsEvents = function() {
    function AnalyticsEvents(apiCall) {
        this.apiCall = apiCall;
        this.apiCall = apiCall;
    }
    AnalyticsEvents.prototype.create = function(params) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.post(this.endpointPath(), params)
                ];
            });
        });
    };
    AnalyticsEvents.prototype.endpointPath = function(operation) {
        return "".concat(AnalyticsEvents.RESOURCEPATH).concat(operation === undefined ? "" : "/" + encodeURIComponent(operation));
    };
    Object.defineProperty(AnalyticsEvents, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return AnalyticsEvents;
}();
exports.default = AnalyticsEvents; //# sourceMappingURL=AnalyticsEvents.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Analytics.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var AnalyticsRules_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/AnalyticsRules.js [app-route] (ecmascript)"));
var AnalyticsRule_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/AnalyticsRule.js [app-route] (ecmascript)"));
var AnalyticsEvents_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/AnalyticsEvents.js [app-route] (ecmascript)"));
var RESOURCEPATH = "/analytics";
var Analytics = function() {
    function Analytics(apiCall) {
        this.apiCall = apiCall;
        this.individualAnalyticsRules = {};
        this.apiCall = apiCall;
        this._analyticsRules = new AnalyticsRules_1.default(this.apiCall);
        this._analyticsEvents = new AnalyticsEvents_1.default(this.apiCall);
    }
    Analytics.prototype.rules = function(id) {
        if (id === undefined) {
            return this._analyticsRules;
        } else {
            if (this.individualAnalyticsRules[id] === undefined) {
                this.individualAnalyticsRules[id] = new AnalyticsRule_1.default(id, this.apiCall);
            }
            return this.individualAnalyticsRules[id];
        }
    };
    Analytics.prototype.events = function() {
        return this._analyticsEvents;
    };
    Object.defineProperty(Analytics, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return Analytics;
}();
exports.default = Analytics; //# sourceMappingURL=Analytics.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Stopwords.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RESOURCEPATH = "/stopwords";
var Stopwords = function() {
    function Stopwords(apiCall) {
        this.apiCall = apiCall;
    }
    Stopwords.prototype.upsert = function(stopwordId, params) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.put(this.endpointPath(stopwordId), params)
                ];
            });
        });
    };
    Stopwords.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    Stopwords.prototype.endpointPath = function(operation) {
        return "".concat(Stopwords.RESOURCEPATH).concat(operation === undefined ? "" : "/" + encodeURIComponent(operation));
    };
    Object.defineProperty(Stopwords, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return Stopwords;
}();
exports.default = Stopwords; //# sourceMappingURL=Stopwords.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Stopword.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Stopwords_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Stopwords.js [app-route] (ecmascript)"));
var Stopword = function() {
    function Stopword(stopwordId, apiCall) {
        this.stopwordId = stopwordId;
        this.apiCall = apiCall;
    }
    Stopword.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    Stopword.prototype.delete = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.delete(this.endpointPath())
                ];
            });
        });
    };
    Stopword.prototype.endpointPath = function() {
        return "".concat(Stopwords_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.stopwordId));
    };
    return Stopword;
}();
exports.default = Stopword; //# sourceMappingURL=Stopword.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/ConversationModels.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RESOURCEPATH = "/conversations/models";
var ConversationModels = function() {
    function ConversationModels(apiCall) {
        this.apiCall = apiCall;
        this.apiCall = apiCall;
    }
    ConversationModels.prototype.create = function(params) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.post(this.endpointPath(), params)
                ];
            });
        });
    };
    ConversationModels.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    ConversationModels.prototype.endpointPath = function(operation) {
        return "".concat(ConversationModels.RESOURCEPATH).concat(operation === undefined ? "" : "/" + encodeURIComponent(operation));
    };
    Object.defineProperty(ConversationModels, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return ConversationModels;
}();
exports.default = ConversationModels; //# sourceMappingURL=ConversationModels.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/ConversationModel.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var ConversationModels_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/ConversationModels.js [app-route] (ecmascript)"));
var ConversationModel = function() {
    function ConversationModel(id, apiCall) {
        this.id = id;
        this.apiCall = apiCall;
    }
    ConversationModel.prototype.update = function(params) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.put(this.endpointPath(), params)
                ];
            });
        });
    };
    ConversationModel.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    ConversationModel.prototype.delete = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.delete(this.endpointPath())
                ];
            });
        });
    };
    ConversationModel.prototype.endpointPath = function() {
        return "".concat(ConversationModels_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.id));
    };
    return ConversationModel;
}();
exports.default = ConversationModel; //# sourceMappingURL=ConversationModel.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Conversations.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var ConversationModels_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/ConversationModels.js [app-route] (ecmascript)"));
var ConversationModel_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/ConversationModel.js [app-route] (ecmascript)"));
var RESOURCEPATH = "/conversations";
var Conversations = function() {
    function Conversations(apiCall) {
        this.apiCall = apiCall;
        this.individualConversationModels = {};
        this.apiCall = apiCall;
        this._conversationsModels = new ConversationModels_1.default(this.apiCall);
    }
    Conversations.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(RESOURCEPATH)
                ];
            });
        });
    };
    Conversations.prototype.models = function(id) {
        if (id === undefined) {
            return this._conversationsModels;
        } else {
            if (this.individualConversationModels[id] === undefined) {
                this.individualConversationModels[id] = new ConversationModel_1.default(id, this.apiCall);
            }
            return this.individualConversationModels[id];
        }
    };
    Object.defineProperty(Conversations, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return Conversations;
}();
exports.default = Conversations; //# sourceMappingURL=Conversations.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Conversation.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Conversations_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Conversations.js [app-route] (ecmascript)"));
var Conversation = function() {
    function Conversation(id, apiCall) {
        this.id = id;
        this.apiCall = apiCall;
    }
    Conversation.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    Conversation.prototype.update = function(params) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.put(this.endpointPath(), params)
                ];
            });
        });
    };
    Conversation.prototype.delete = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.delete(this.endpointPath())
                ];
            });
        });
    };
    Conversation.prototype.endpointPath = function() {
        return "".concat(Conversations_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.id));
    };
    return Conversation;
}();
exports.default = Conversation; //# sourceMappingURL=Conversation.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/StemmingDictionaries.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RESOURCEPATH = "/stemming/dictionaries";
var StemmingDictionaries = function() {
    function StemmingDictionaries(apiCall) {
        this.apiCall = apiCall;
        this.apiCall = apiCall;
    }
    StemmingDictionaries.prototype.upsert = function(id, wordRootCombinations) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            var wordRootCombinationsInJSONLFormat, resultsInJSONLFormat;
            return tslib_1.__generator(this, function(_a) {
                switch(_a.label){
                    case 0:
                        wordRootCombinationsInJSONLFormat = Array.isArray(wordRootCombinations) ? wordRootCombinations.map(function(combo) {
                            return JSON.stringify(combo);
                        }).join("\n") : wordRootCombinations;
                        return [
                            4 /*yield*/ ,
                            this.apiCall.performRequest("post", this.endpointPath("import"), {
                                queryParameters: {
                                    id: id
                                },
                                bodyParameters: wordRootCombinationsInJSONLFormat,
                                additionalHeaders: {
                                    "Content-Type": "text/plain"
                                },
                                skipConnectionTimeout: true
                            })
                        ];
                    case 1:
                        resultsInJSONLFormat = _a.sent();
                        return [
                            2 /*return*/ ,
                            Array.isArray(wordRootCombinations) ? resultsInJSONLFormat.split("\n").map(function(line) {
                                return JSON.parse(line);
                            }) : resultsInJSONLFormat
                        ];
                }
            });
        });
    };
    StemmingDictionaries.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    StemmingDictionaries.prototype.endpointPath = function(operation) {
        return operation === undefined ? "".concat(StemmingDictionaries.RESOURCEPATH) : "".concat(StemmingDictionaries.RESOURCEPATH, "/").concat(encodeURIComponent(operation));
    };
    Object.defineProperty(StemmingDictionaries, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return StemmingDictionaries;
}();
exports.default = StemmingDictionaries; //# sourceMappingURL=StemmingDictionaries.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/StemmingDictionary.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var StemmingDictionaries_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/StemmingDictionaries.js [app-route] (ecmascript)"));
var StemmingDictionary = function() {
    function StemmingDictionary(id, apiCall) {
        this.id = id;
        this.apiCall = apiCall;
    }
    StemmingDictionary.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    StemmingDictionary.prototype.endpointPath = function() {
        return "".concat(StemmingDictionaries_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.id));
    };
    return StemmingDictionary;
}();
exports.default = StemmingDictionary; //# sourceMappingURL=StemmingDictionary.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Stemming.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var StemmingDictionaries_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/StemmingDictionaries.js [app-route] (ecmascript)"));
var StemmingDictionary_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/StemmingDictionary.js [app-route] (ecmascript)"));
var RESOURCEPATH = "/stemming";
var Stemming = function() {
    function Stemming(apiCall) {
        this.apiCall = apiCall;
        this.individualStemmingDictionaries = {};
        this.apiCall = apiCall;
        this._stemmingDictionaries = new StemmingDictionaries_1.default(this.apiCall);
    }
    Stemming.prototype.dictionaries = function(id) {
        if (id === undefined) {
            return this._stemmingDictionaries;
        } else {
            if (this.individualStemmingDictionaries[id] === undefined) {
                this.individualStemmingDictionaries[id] = new StemmingDictionary_1.default(id, this.apiCall);
            }
            return this.individualStemmingDictionaries[id];
        }
    };
    Object.defineProperty(Stemming, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return Stemming;
}();
exports.default = Stemming; //# sourceMappingURL=Stemming.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/NLSearchModels.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var RESOURCEPATH = "/nl_search_models";
var NLSearchModels = function() {
    function NLSearchModels(apiCall) {
        this.apiCall = apiCall;
    }
    NLSearchModels.prototype.create = function(schema) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.post(this.endpointPath(), schema)
                ];
            });
        });
    };
    NLSearchModels.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    NLSearchModels.prototype.endpointPath = function() {
        return NLSearchModels.RESOURCEPATH;
    };
    Object.defineProperty(NLSearchModels, "RESOURCEPATH", {
        get: function() {
            return RESOURCEPATH;
        },
        enumerable: false,
        configurable: true
    });
    return NLSearchModels;
}();
exports.default = NLSearchModels; //# sourceMappingURL=NLSearchModels.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/NLSearchModel.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var NLSearchModels_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/NLSearchModels.js [app-route] (ecmascript)"));
var NLSearchModel = function() {
    function NLSearchModel(id, apiCall) {
        this.id = id;
        this.apiCall = apiCall;
    }
    NLSearchModel.prototype.retrieve = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.get(this.endpointPath())
                ];
            });
        });
    };
    NLSearchModel.prototype.update = function(schema) {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.put(this.endpointPath(), schema)
                ];
            });
        });
    };
    NLSearchModel.prototype.delete = function() {
        return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
                return [
                    2 /*return*/ ,
                    this.apiCall.delete(this.endpointPath())
                ];
            });
        });
    };
    NLSearchModel.prototype.endpointPath = function() {
        return "".concat(NLSearchModels_1.default.RESOURCEPATH, "/").concat(encodeURIComponent(this.id));
    };
    return NLSearchModel;
}();
exports.default = NLSearchModel; //# sourceMappingURL=NLSearchModel.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Client.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/* eslint-disable no-dupe-class-members */ Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Configuration_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Configuration.js [app-route] (ecmascript)"));
var ApiCall_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/ApiCall.js [app-route] (ecmascript)"));
var Collections_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Collections.js [app-route] (ecmascript)"));
var Collection_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Collection.js [app-route] (ecmascript)"));
var Aliases_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Aliases.js [app-route] (ecmascript)"));
var Alias_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Alias.js [app-route] (ecmascript)"));
var Keys_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Keys.js [app-route] (ecmascript)"));
var Key_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Key.js [app-route] (ecmascript)"));
var Debug_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Debug.js [app-route] (ecmascript)"));
var Metrics_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Metrics.js [app-route] (ecmascript)"));
var Stats_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Stats.js [app-route] (ecmascript)"));
var Health_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Health.js [app-route] (ecmascript)"));
var Operations_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Operations.js [app-route] (ecmascript)"));
var MultiSearch_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/MultiSearch.js [app-route] (ecmascript)"));
var Presets_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Presets.js [app-route] (ecmascript)"));
var Preset_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Preset.js [app-route] (ecmascript)"));
var Analytics_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Analytics.js [app-route] (ecmascript)"));
var Stopwords_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Stopwords.js [app-route] (ecmascript)"));
var Stopword_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Stopword.js [app-route] (ecmascript)"));
var Conversations_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Conversations.js [app-route] (ecmascript)"));
var Conversation_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Conversation.js [app-route] (ecmascript)"));
var Stemming_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Stemming.js [app-route] (ecmascript)"));
var NLSearchModels_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/NLSearchModels.js [app-route] (ecmascript)"));
var NLSearchModel_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/NLSearchModel.js [app-route] (ecmascript)"));
var Client = function() {
    function Client(options) {
        var _a;
        options.sendApiKeyAsQueryParam = (_a = options.sendApiKeyAsQueryParam) !== null && _a !== void 0 ? _a : false;
        this.configuration = new Configuration_1.default(options);
        this.apiCall = new ApiCall_1.default(this.configuration);
        this.debug = new Debug_1.default(this.apiCall);
        this.metrics = new Metrics_1.default(this.apiCall);
        this.stats = new Stats_1.default(this.apiCall);
        this.health = new Health_1.default(this.apiCall);
        this.operations = new Operations_1.default(this.apiCall);
        this.multiSearch = new MultiSearch_1.default(this.apiCall, this.configuration);
        this._collections = new Collections_1.default(this.apiCall);
        this.individualCollections = {};
        this._aliases = new Aliases_1.default(this.apiCall);
        this.individualAliases = {};
        this._keys = new Keys_1.default(this.apiCall);
        this.individualKeys = {};
        this._presets = new Presets_1.default(this.apiCall);
        this.individualPresets = {};
        this._stopwords = new Stopwords_1.default(this.apiCall);
        this.individualStopwords = {};
        this.analytics = new Analytics_1.default(this.apiCall);
        this.stemming = new Stemming_1.default(this.apiCall);
        this._conversations = new Conversations_1.default(this.apiCall);
        this.individualConversations = {};
        this._nlSearchModels = new NLSearchModels_1.default(this.apiCall);
        this.individualNLSearchModels = {};
    }
    Client.prototype.collections = function(collectionName) {
        if (collectionName === undefined) {
            return this._collections;
        } else {
            if (this.individualCollections[collectionName] === undefined) {
                this.individualCollections[collectionName] = new Collection_1.default(collectionName, this.apiCall, this.configuration);
            }
            return this.individualCollections[collectionName];
        }
    };
    Client.prototype.aliases = function(aliasName) {
        if (aliasName === undefined) {
            return this._aliases;
        } else {
            if (this.individualAliases[aliasName] === undefined) {
                this.individualAliases[aliasName] = new Alias_1.default(aliasName, this.apiCall);
            }
            return this.individualAliases[aliasName];
        }
    };
    Client.prototype.keys = function(id) {
        if (id === undefined) {
            return this._keys;
        } else {
            if (this.individualKeys[id] === undefined) {
                this.individualKeys[id] = new Key_1.default(id, this.apiCall);
            }
            return this.individualKeys[id];
        }
    };
    Client.prototype.presets = function(id) {
        if (id === undefined) {
            return this._presets;
        } else {
            if (this.individualPresets[id] === undefined) {
                this.individualPresets[id] = new Preset_1.default(id, this.apiCall);
            }
            return this.individualPresets[id];
        }
    };
    Client.prototype.stopwords = function(id) {
        if (id === undefined) {
            return this._stopwords;
        } else {
            if (this.individualStopwords[id] === undefined) {
                this.individualStopwords[id] = new Stopword_1.default(id, this.apiCall);
            }
            return this.individualStopwords[id];
        }
    };
    Client.prototype.conversations = function(id) {
        if (id === undefined) {
            return this._conversations;
        } else {
            if (this.individualConversations[id] === undefined) {
                this.individualConversations[id] = new Conversation_1.default(id, this.apiCall);
            }
            return this.individualConversations[id];
        }
    };
    Client.prototype.nlSearchModels = function(id) {
        if (id === undefined) {
            return this._nlSearchModels;
        } else {
            if (this.individualNLSearchModels[id] === undefined) {
                this.individualNLSearchModels[id] = new NLSearchModel_1.default(id, this.apiCall);
            }
            return this.individualNLSearchModels[id];
        }
    };
    return Client;
}();
exports.default = Client; //# sourceMappingURL=Client.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/SearchOnlyCollection.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.SearchOnlyCollection = void 0;
var SearchOnlyDocuments_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/SearchOnlyDocuments.js [app-route] (ecmascript)");
var SearchOnlyCollection = function() {
    function SearchOnlyCollection(name, apiCall, configuration) {
        this.name = name;
        this.apiCall = apiCall;
        this.configuration = configuration;
        this._documents = new SearchOnlyDocuments_1.SearchOnlyDocuments(this.name, this.apiCall, this.configuration);
    }
    SearchOnlyCollection.prototype.documents = function() {
        return this._documents;
    };
    return SearchOnlyCollection;
}();
exports.SearchOnlyCollection = SearchOnlyCollection; //# sourceMappingURL=SearchOnlyCollection.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/SearchClient.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Configuration_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Configuration.js [app-route] (ecmascript)"));
var ApiCall_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/ApiCall.js [app-route] (ecmascript)"));
var MultiSearch_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/MultiSearch.js [app-route] (ecmascript)"));
var SearchOnlyCollection_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/SearchOnlyCollection.js [app-route] (ecmascript)");
var SearchClient = function() {
    function SearchClient(options) {
        var _a;
        options.sendApiKeyAsQueryParam = (_a = options.sendApiKeyAsQueryParam) !== null && _a !== void 0 ? _a : true;
        if (options.sendApiKeyAsQueryParam === true && (options.apiKey || "").length > 2000) {
            console.warn("[typesense] API Key is longer than 2000 characters which is over the allowed limit, so disabling sending it as a query parameter.");
            options.sendApiKeyAsQueryParam = false;
        }
        this.configuration = new Configuration_1.default(options);
        this.apiCall = new ApiCall_1.default(this.configuration);
        this.multiSearch = new MultiSearch_1.default(this.apiCall, this.configuration, true);
        this.individualCollections = {};
    }
    SearchClient.prototype.clearCache = function() {
        this.multiSearch.clearCache();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.entries(this.individualCollections).forEach(function(_a) {
            var _ = _a[0], collection = _a[1];
            collection.documents().clearCache();
        });
    };
    SearchClient.prototype.collections = function(collectionName) {
        if (!collectionName) {
            throw new Error("Typesense.SearchClient only supports search operations, so the collectionName that needs to " + "be searched must be specified. Use Typesense.Client if you need to access the collection object.");
        } else {
            if (this.individualCollections[collectionName] === undefined) {
                this.individualCollections[collectionName] = new SearchOnlyCollection_1.SearchOnlyCollection(collectionName, this.apiCall, this.configuration);
            }
            return this.individualCollections[collectionName];
        }
    };
    return SearchClient;
}();
exports.default = SearchClient; //# sourceMappingURL=SearchClient.js.map
}),
"[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Errors = exports.SearchClient = exports.Client = void 0;
var tslib_1 = __turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/tslib/tslib.es6.mjs [app-route] (ecmascript)");
var Client_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Client.js [app-route] (ecmascript)"));
exports.Client = Client_1.default;
var SearchClient_1 = tslib_1.__importDefault(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/SearchClient.js [app-route] (ecmascript)"));
exports.SearchClient = SearchClient_1.default;
var Errors = tslib_1.__importStar(__turbopack_context__.r("[project]/Documents/Antigravity/ProjectProfound/profound-archive/node_modules/typesense/lib/Typesense/Errors/index.js [app-route] (ecmascript)"));
exports.Errors = Errors;
exports.default = {
    Client: Client_1.default,
    SearchClient: SearchClient_1.default,
    Errors: Errors
}; //# sourceMappingURL=Typesense.js.map
}),
];

//# sourceMappingURL=26d59_typesense_lib_63dac012._.js.map