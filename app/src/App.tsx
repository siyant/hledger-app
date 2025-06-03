import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function greet() {
    if (!name.trim()) return;
    
    setIsLoading(true);
    try {
      const message = await invoke<string>("greet", { name });
      setGreetMsg(message);
    } catch (error) {
      console.error("Failed to greet:", error);
      setGreetMsg("Failed to connect to Tauri backend");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Tauri + shadcn/ui + Tailwind
          </h1>
          <p className="text-xl text-muted-foreground">
            Modern desktop app boilerplate
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary">Tauri v2</Badge>
            <Badge variant="secondary">React 18</Badge>
            <Badge variant="secondary">TypeScript</Badge>
          </div>
        </div>

        {/* Demo Card */}
        <Card>
          <CardHeader>
            <CardTitle>Demo</CardTitle>
            <CardDescription>
              Test the Tauri backend integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && greet()}
              />
              <Button 
                onClick={greet} 
                disabled={isLoading || !name.trim()}
              >
                {isLoading ? "..." : "Greet"}
              </Button>
            </div>
            {greetMsg && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">{greetMsg}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">⚡ Fast</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Rust-powered backend with native performance
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">🎨 Modern</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Beautiful UI with shadcn/ui and Tailwind CSS
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">🔐 Secure</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Memory safety with Rust and Tauri's security model
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Built with Tauri, React, TypeScript, shadcn/ui, and Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
}

export default App;
