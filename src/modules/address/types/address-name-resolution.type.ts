export type AddressNameResolutionInput = {
  barangay: string;
  cityMunicipality: string;
  province: string;
};

export type AddressNameResolutionResult = {
  barangay: {
    code: string;
    name: string;
  };
  cityMunicipality: {
    code: string;
    name: string;
  };
  province: {
    code: string;
    name: string;
  };
  region: {
    code: string;
    name: string;
  };
};
