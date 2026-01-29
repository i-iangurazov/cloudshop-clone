import { redirect } from "next/navigation";
import { getServerAuthToken } from "@/server/auth/token";

const RootPage = async () => {
  const token = await getServerAuthToken();
  redirect(token ? "/dashboard" : "/login");
};

export default RootPage;
