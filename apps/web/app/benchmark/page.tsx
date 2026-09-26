import type { Metadata } from "next";
import { BenchmarkDashboard } from "../../components/benchmark/BenchmarkDashboard";

export const metadata: Metadata = {
  title: "Performance Benchmark Suite | 3D Showcase Engine",
  description:
    "Automated 4-phase device stress testing, live framerate latency profiling, hardware tier rating, and adaptive render policy recommendation.",
};

export default function BenchmarkPage() {
  return <BenchmarkDashboard />;
}
