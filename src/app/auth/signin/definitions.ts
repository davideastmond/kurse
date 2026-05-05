export type SigninFieldErrors = {
  email?: string;
  password?: string;
};

export type SigninActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: SigninFieldErrors;
};

export const initialSigninActionState: SigninActionState = {
  status: "idle",
};
