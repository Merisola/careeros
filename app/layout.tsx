import "./globals.css";
export const metadata = { title: "CareerOS" };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><main><nav className="noprint"><a href="/">Jobs</a> · <a href="/profile">Master profile</a></nav>{children}</main></body></html>;
}
