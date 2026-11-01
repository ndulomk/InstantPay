type Membership = {
  orgId: string;
  orgName: string;
};

type OrgSwitchState = {
  memberships: Membership[];
  activeMembership: Membership | null;
  switching: boolean;
  isLoading: boolean;
  switchOrg: (orgId: string) => void;
};

/**
 * O kit exporta um `OrgSwitcher` opcional. O admin-dashboard é single-tenant,
 * por isso a implementação devolve uma lista vazia e o switcher não é mostrado.
 */
export const useOrgSwitch = (): OrgSwitchState => ({
  memberships: [],
  activeMembership: null,
  switching: false,
  isLoading: false,
  switchOrg: () => undefined,
});
