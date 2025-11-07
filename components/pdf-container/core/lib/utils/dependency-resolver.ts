export class DependencyResolver {
  private dependencyGraph = new Map<string, Set<string>>();

  addNode(id: string, dependencies: string[] = []) {
    this.dependencyGraph.set(id, new Set(dependencies));
  }

  private hasCircularDependencies(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (id: string): boolean => {
      visited.add(id);
      recursionStack.add(id);

      const dependencies = this.dependencyGraph.get(id) || new Set();
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          if (dfs(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true; // Circular dependency found
        }
      }

      recursionStack.delete(id);
      return false;
    };

    for (const id of this.dependencyGraph.keys()) {
      if (!visited.has(id)) {
        if (dfs(id)) return true;
      }
    }

    return false;
  }

  resolveLoadOrder(): string[] {
    if (this.hasCircularDependencies()) {
      throw new Error('Circular dependencies detected');
    }

    const result: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (id: string) => {
      if (temp.has(id)) throw new Error('Circular dependency');
      if (visited.has(id)) return;

      temp.add(id);

      const dependencies = this.dependencyGraph.get(id) || new Set();
      for (const dep of dependencies) {
        visit(dep);
      }

      temp.delete(id);
      visited.add(id);
      result.push(id);
    };

    for (const id of this.dependencyGraph.keys()) {
      if (!visited.has(id)) {
        visit(id);
      }
    }

    return result;
  }
}
