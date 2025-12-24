import { Loader } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-full h-[100vh] flex">
      <div className="w-full h-[100vh] flex flex-col items-center justify-center">
        <Loader className="size-10 animate-spin" />
      </div>
    </div>
  )
}