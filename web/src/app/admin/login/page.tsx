import { redirect } from "next/navigation";
import { loginAdmin } from "@/lib/admin-auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    if (await loginAdmin(String(formData.get("password") ?? ""))) redirect("/admin");
    redirect("/admin/login?error=1");
  }

  return (
    <form action={login} className="mx-auto mt-32 w-72 space-y-3">
      <h1 className="text-lg font-semibold">后台登录</h1>
      <input name="password" type="password" placeholder="密码（见 .env ADMIN_PASSWORD）" className="input" autoFocus />
      {error && <p className="text-sm text-red-600">密码错误</p>}
      <button className="btn w-full">登录</button>
    </form>
  );
}
