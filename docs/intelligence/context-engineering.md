# Context Engineering & Prompt Budgeting: KDI AI Office

## 1. Overview & Core Philosophy
**Context Engineering** in **KDI AI Office** is the discipline of curating, sizing, and structuring the exact token payload presented to an LLM. 

Even models with 1M+ token windows (such as Gemini 1.5 Pro) suffer from the *Lost in the Middle* phenomenon and attention dilution when flooded with redundant boilerplate. Furthermore, smaller fallback models (Ollama 3B/7B) operate strictly within an 8k to 32k token ceiling.

---

## 2. Dynamic Token Budgeting Model

Every agent invocation is allocated a strict **Token Budget** governed by the assigned model's context limit:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Total Context Window Budget: 100%                                      │
├─────────────────┬──────────┬──────────────┬──────────────┬─────────────┤
│ System Prompt   │ GraphRAG │ Active Code  │ Tool History │ Output Resv │
│ & Role Persona  │ Context  │ & AST Diffs  │ & Turn Logs  │ for Output  │
│ (10%)           │ (25%)    │ (35%)        │ (15%)        │ (15%)       │
└─────────────────┴──────────┴──────────────┴──────────────┴─────────────┘
```

| Partition | Share of Budget | Max Budget (8k Model) | Max Budget (128k Model) | Content Description |
|---|:---:|:---:|:---:|---|
| **System & Persona** | 10% | 800 tokens | 12,800 tokens | Persona rules, forbidden actions, JSON output schema. |
| **GraphRAG Subgraph** | 25% | 2,000 tokens | 32,000 tokens | Topological dependency contracts, ADR references. |
| **Active Code Target** | 35% | 2,800 tokens | 44,800 tokens | File under edit, surrounding function bodies, AST blocks. |
| **Turn History & Tools**| 15% | 1,200 tokens | 19,200 tokens | Recent tool execution outputs, test runner errors. |
| **Output Reservation** | 15% | 1,200 tokens | 19,200 tokens | Reserved headroom for model generation. |

---

## 3. Code Compression & AST Truncation Techniques

When repository files exceed the code budget partition:
1. **Signature Skeletonization (AST Outlining):** For non-target imported files, the body of functions is stripped, leaving only exported interfaces, method signatures, parameter types, and return types:
   ```typescript
   // Skeletonized representation
   export class StudentService {
     async getStudentById(id: string): Promise<Student> { /* ... truncated ... */ }
     async updatePickupStatus(id: string, status: PickupStatus): Promise<boolean> { /* ... truncated ... */ }
   }
   ```
2. **Hunk Windowing for Diffs:** When feeding git diffs, only the modified hunk plus 5 lines of surrounding context are retained; unrelated functions in the file are omitted.
3. **Log Truncation & Tail Extraction:** Test execution outputs exceeding 100 lines are truncated to show:
   - Command invoked + environment.
   - The first 10 lines of setup.
   - The final 50 lines showing exact test failure assertions and call stack.

---

## 4. Canonical Prompt Structure Template

```xml
<system_directive>
  You are the Software Engineer agent in KDI AI Office.
  You execute surgical bugfixes and code refactoring.
  Forbidden: No direct shell commands, no force pushes, no raw file deletions.
</system_directive>

<task_goal id="tsk_1092" risk="LOW">
  Periksa bug modul pickup Koneksi Santri. Kalau low risk, perbaiki, test, commit.
</task_goal>

<architectural_context>
  <!-- GraphRAG injected dependency contracts -->
  <contract id="PickupServiceContract" source="docs/api/pickup.yaml" />
  <adr id="ADR-004" summary="Event-driven pickup status using Redis pub/sub" />
</architectural_context>

<working_files>
  <file path="src/services/PickupService.ts" target="true">
    <![CDATA[
      // File content or target AST function body
    ]]>
  </file>
</working_files>

<execution_history>
  <!-- Last 2 turns only -->
  <turn role="assistant">Called tool_shell(npm test)</turn>
  <turn role="tool_result" exit_code="1">
    TypeError: Cannot read property 'status' of null in PickupService.ts:48
  </turn>
</execution_history>

<instruction>
  Analyze the null pointer exception on line 48. Apply a surgical patch ensuring null safety.
  Respond ONLY with a valid JSON tool call to tool_filesystem.write_file.
</instruction>
```
