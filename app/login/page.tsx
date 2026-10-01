import LoginForm from "./LoginForm";

export default function Login() {
  return (
    <div className="flex min-h-[70vh] flex-col justify-center space-y-6">
      <header className="text-center">
        <p className="text-5xl" aria-hidden>🔭</p>
        <h1 className="mt-3 text-2xl font-bold">Drop Watcher</h1>
      </header>
      <LoginForm />
    </div>
  );
}
