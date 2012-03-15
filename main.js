if (typeof define !== 'function') { var define = (require('amdefine'))(module); }

define([
  "./_errors",
  "./Client"
], function(errors ,Client){
  "use strict";

  return {
    OAuthError: errors.OAuthError,

    InvalidRequest: errors.InvalidRequest,
    InvalidClient: errors.InvalidClient,
    InvalidGrant: errors.InvalidGrant,
    InvalidToken: errors.InvalidToken,
    InvalidScope: errors.InvalidScope,
    InsufficientScope: errors.InsufficientScope,

    UnauthorizedClient: errors.UnauthorizedClient,

    UnsupportedGrantType: errors.UnsupportedGrantType,
    UnsupportedResponseType: errors.UnsupportedResponseType,

    AccesDenied: errors.AccesDenied,
    ServerError: errors.ServerError,
    TemporarilyUnavailable: errors.TemporarilyUnavailable,

    Client: Client
  };
});
