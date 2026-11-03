import { describe, it, expect, vi } from "vitest";
import { optimisticUpdate } from "./optimistic";

describe("optimisticUpdate", () => {
  it("aplica imediatamente e NÃO reverte quando asyncOp resolve (sucesso)", async () => {
    let state = "original";
    const apply = vi.fn(() => {
      state = "optimistic";
    });
    const revert = vi.fn(() => {
      state = "original";
    });
    const asyncOp = vi.fn(async () => "server-result");
    const onError = vi.fn();

    const result = await optimisticUpdate(apply, revert, asyncOp, onError);

    expect(apply).toHaveBeenCalledOnce();
    expect(asyncOp).toHaveBeenCalledOnce();
    expect(revert).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(state).toBe("optimistic");
    expect(result).toBe("server-result");
  });

  it("reverte state e chama onError quando asyncOp rejeita (rollback)", async () => {
    let state = "original";
    const apply = vi.fn(() => {
      state = "optimistic";
    });
    const revert = vi.fn(() => {
      state = "original";
    });
    const asyncOp = vi.fn(async () => {
      throw new Error("network failure");
    });
    const onError = vi.fn();

    const result = await optimisticUpdate(apply, revert, asyncOp, onError);

    expect(apply).toHaveBeenCalledOnce();
    expect(asyncOp).toHaveBeenCalledOnce();
    expect(revert).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith("network failure");
    expect(state).toBe("original");
    expect(result).toBeNull();
  });

  it("revert SEMPRE vem antes de onError (ordem invariante)", async () => {
    const calls: string[] = [];
    const apply = () => calls.push("apply");
    const revert = () => calls.push("revert");
    const asyncOp = async () => {
      calls.push("asyncOp");
      throw new Error("boom");
    };
    const onError = () => calls.push("onError");

    await optimisticUpdate(apply, revert, asyncOp, onError);

    expect(calls).toEqual(["apply", "asyncOp", "revert", "onError"]);
  });

  it("converte não-Error em string via String()", async () => {
    const apply = vi.fn();
    const revert = vi.fn();
    const asyncOp = async () => {
      throw "plain string error"; // eslint-disable-line @typescript-eslint/only-throw-error
    };
    const onError = vi.fn();

    await optimisticUpdate(apply, revert, asyncOp, onError);

    expect(onError).toHaveBeenCalledWith("plain string error");
  });

  it("sem onError, ainda reverte silenciosamente", async () => {
    let state = "original";
    const apply = () => {
      state = "optimistic";
    };
    const revert = () => {
      state = "original";
    };
    const asyncOp = async () => {
      throw new Error("silent");
    };

    const result = await optimisticUpdate(apply, revert, asyncOp);

    expect(state).toBe("original");
    expect(result).toBeNull();
  });
});
