export class DependencyResolver {
  private dependencyGraph: Map<string, Set<string>>

  constructor() {
    this.dependencyGraph = /* @__PURE__ */ new Map()
  }

  addNode(id: string, dependencies: string[] = []): void {
    this.dependencyGraph.set(id, new Set(dependencies))
  }

  hasCircularDependencies(): boolean {
    const visited = /* @__PURE__ */ new Set()
    const recursionStack = /* @__PURE__ */ new Set()
    const dfs = (id: string): boolean => {
      visited.add(id)
      recursionStack.add(id)
      const dependencies = this.dependencyGraph.get(id) || /* @__PURE__ */ new Set()
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          if (dfs(dep)) return true
        } else if (recursionStack.has(dep)) {
          return true
        }
      }
      recursionStack.delete(id)
      return false
    }
    for (const id of this.dependencyGraph.keys()) {
      if (!visited.has(id)) {
        if (dfs(id)) return true
      }
    }
    return false
  }

  resolveLoadOrder(): string[] {
    if (this.hasCircularDependencies()) {
      throw new Error("Circular dependencies detected")
    }
    const result: string[] = []
    const visited = /* @__PURE__ */ new Set()
    const temp = /* @__PURE__ */ new Set()
    const visit = (id: string): void => {
      if (temp.has(id)) throw new Error("Circular dependency")
      if (visited.has(id)) return
      temp.add(id)
      const dependencies = this.dependencyGraph.get(id) || /* @__PURE__ */ new Set()
      for (const dep of dependencies) {
        visit(dep)
      }
      temp.delete(id)
      visited.add(id)
      result.push(id)
    }
    for (const id of this.dependencyGraph.keys()) {
      if (!visited.has(id)) {
        visit(id)
      }
    }
    return result
  }
}
