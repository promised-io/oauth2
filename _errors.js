if (typeof define !== 'function') { var define = (require('amdefine'))(module); }

define([
  "exports",
  "promised-io/lib/errorFactory"
], function(exports, errorFactory){
  "use strict";

  var Base = exports.OAuthError = errorFactory("OAuthError", "An error occured in the OAuth flow.");

  exports.InvalidRequest = errorFactory("InvalidRequest", "invalid_request", Base);
  exports.InvalidClient = errorFactory("InvalidClient", "invalid_client", Base);
  exports.InvalidGrant = errorFactory("InvalidGrant", "invalid_grant", Base);
  exports.InvalidToken = errorFactory("InvalidToken", "invalid_token", Base);
  exports.InvalidScope = errorFactory("InvalidScope", "invalid_scope", Base);
  exports.InsufficientScope = errorFactory("InsufficientScope", "insufficient_scope", Base);

  exports.UnauthorizedClient = errorFactory("UnauthorizedClient", "unauthorized_client", Base);

  exports.UnsupportedGrantType = errorFactory("UnsupportedGrantType", "unsupported_grant_type", Base);
  exports.UnsupportedResponseType = errorFactory("UnsupportedResponseType", "unsupported_response_type", Base);

  exports.AccesDenied = errorFactory("AccesDenied", "acces_denied", Base);
  exports.ServerError = errorFactory("ServerError", "servererror", Base);
  exports.TemporarilyUnavailable = errorFactory("TemporarilyUnavailable", "temporarilyunavailable", Base);
});
