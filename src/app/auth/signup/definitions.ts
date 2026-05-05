export type SignupFieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export type SignupActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: SignupFieldErrors;
};

export const initialSignupActionState: SignupActionState = {
  status: "idle",
};
