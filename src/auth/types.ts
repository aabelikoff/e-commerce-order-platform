import { ERoles } from "./access/roles";
import { EUnitedScopes } from "./access/scopes";

export type JwtAccessPayload = {
  sub: string;
  email: string;
  roles: ERoles[];
  scopes: EUnitedScopes[];
};

export type AuthUser = {
  sub: string;
  email: string;
  roles: ERoles[];
  scopes: EUnitedScopes[];
};

