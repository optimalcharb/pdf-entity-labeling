export declare class DependencyResolver {
  private dependencyGraph
  addNode(id: string, dependencies?: string[]): void
  private hasCircularDependencies
  resolveLoadOrder(): string[]
}
