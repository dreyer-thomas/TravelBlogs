type CreatorUser = {
  id: string;
  name: string;
  email: string;
};

const creatorUser: CreatorUser = {
  id: "creator",
  name: "Creator",
  email: "",
};

const readCreatorConfig = () => {
  const email = process.env.CREATOR_EMAIL?.trim() ?? "";
  const password = process.env.CREATOR_PASSWORD?.trim() ?? "";

  return { email, password };
};

export const validateCredentials = (
  email: string,
  password: string,
): CreatorUser | null => {
  const config = readCreatorConfig();

  if (!config.email || !config.password) {
    return null;
  }

  if (email !== config.email || password !== config.password) {
    return null;
  }

  return { ...creatorUser, email: config.email };
};
