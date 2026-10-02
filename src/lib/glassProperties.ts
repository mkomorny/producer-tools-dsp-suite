export class Trackable {
  isDestroyed: boolean = false;

  destroy() {
    this.isDestroyed = true;
  }
}

export type SignalListener = {
  trackable: Trackable | null;
  fn: Function;
};

export class Signal {
  listeners: SignalListener[] = [];

  connect(trackable: Trackable | null, fn: Function) {
    this.listeners.push({ trackable, fn });
  }

  emit() {
    // Filter out destroyed trackables before emitting
    this.listeners = this.listeners.filter(
      (l) => !l.trackable || !l.trackable.isDestroyed
    );
    for (const { fn } of this.listeners) {
      fn();
    }
  }

  disconnectAll() {
    this.listeners.length = 0;
  }
}

export interface PropertyType<T> {
  readonly name: string;
  serialize(value: T, scratch?: any): string | undefined | null;
  deserialize(
    serialized: string,
    context?: any
  ): T | { value: T; scratchSpace?: any } | undefined | null;
}

export const IntPropertyType: PropertyType<number> = {
  name: "Int",
  serialize(n: number) {
    return Math.trunc(n).toString();
  },
  deserialize(s: string) {
    let trimmed = s.trim();
    // Support pure hex without 0x prefix if it contains a-f
    if (/^[0-9a-fA-F]+$/.test(trimmed) && !/^\d+$/.test(trimmed)) {
      trimmed = "0x" + trimmed;
    }
    const n = Number(trimmed);
    if (isNaN(n)) return undefined;
    return Math.trunc(n);
  },
};

export const FloatPropertyType: PropertyType<number> = {
  name: "Float",
  serialize(f: number) {
    return parseFloat(f.toPrecision(5)).toString();
  },
  deserialize(s: string) {
    let trimmed = s.trim();
    if (trimmed.endsWith("f") || trimmed.endsWith("F")) {
      trimmed = trimmed.slice(0, -1);
    }
    const n = Number(trimmed);
    return isNaN(n) ? undefined : n;
  },
};

export const BoolPropertyType: PropertyType<boolean> = {
  name: "Bool",
  serialize(b: boolean) {
    return b ? "true" : "false";
  },
  deserialize(s: string) {
    const lower = s.trim().toLowerCase();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0") return false;
    return undefined;
  },
};

export const StringPropertyType: PropertyType<string> = {
  name: "std::string",
  serialize(s: string) {
    return s;
  },
  deserialize(s: string) {
    return s;
  },
};

export const Float4DimPropertyType: PropertyType<
  number | [number, number, number, number]
> = {
  name: "Float4Dim",
  serialize(val: number | [number, number, number, number]) {
    if (typeof val === "number") {
      return val.toString();
    } else if (Array.isArray(val) && val.length === 4) {
      return val.join(" ");
    }
    return undefined;
  },
  deserialize(s: string) {
    const cleaned = s.replace(/#/g, " ").trim();
    if (cleaned === "") return undefined;
    const parts = cleaned.split(/[\s,]+/).map((p) => Number(p));
    if (parts.some(isNaN)) return undefined;
    if (parts.length === 1) return parts[0];
    if (parts.length >= 4)
      return [parts[0], parts[1], parts[2], parts[3]] as [
        number,
        number,
        number,
        number
      ];
    return undefined;
  },
};

export function VectorProperty<T>(
  elementType: PropertyType<T>
): PropertyType<T[]> {
  return {
    name: `vector<${elementType.name}>`,
    serialize(values: T[], scratch?: any) {
      if (!Array.isArray(values)) return undefined;
      const elements = values.map((val) => {
        let serialized = elementType.serialize(val, scratch);
        if (serialized === undefined || serialized === null) serialized = "";
        return serialized.replace(/,/g, "\\,");
      });
      return `vector(${elements.join(", ")})`;
    },
    deserialize(str: string, context?: any) {
      const match = str.match(/^vector\s*\((.*)\)\s*$/s);
      if (!match) return undefined;
      let inner = match[1].trim();
      if (inner.endsWith(",")) inner = inner.slice(0, -1);

      const tokens: string[] = [];
      let current = "";
      let escape = false;
      for (let i = 0; i < inner.length; i++) {
        const char = inner[i];
        if (escape) {
          current += char;
          escape = false;
        } else if (char === "\\") {
          escape = true;
        } else if (char === ",") {
          tokens.push(current);
          current = "";
        } else {
          current += char;
        }
      }
      if (current.length > 0 || tokens.length > 0) {
        tokens.push(current);
      } else if (inner.length > 0) {
        tokens.push(inner);
      }

      if (tokens.length === 1 && tokens[0].trim() === "") {
        return [];
      }

      const result: T[] = [];
      for (const token of tokens) {
        const deserialized = elementType.deserialize(token.trim(), context);
        if (deserialized === undefined || deserialized === null)
          return undefined; // fail whole vector
        if (
          typeof deserialized === "object" &&
          deserialized !== null &&
          "value" in deserialized
        ) {
          result.push((deserialized as any).value);
        } else {
          result.push(deserialized as T);
        }
      }
      return result;
    },
  };
}

export function OptionalProperty<T>(
  innerType: PropertyType<T>
): PropertyType<T | undefined> {
  return {
    name: `Optional: ${innerType.name}`,
    serialize(value: T | undefined, scratch?: any) {
      if (value === null || value === undefined) return "std::nullopt";
      return innerType.serialize(
        value,
        scratch ? scratch.valueOfInner : undefined
      );
    },
    deserialize(str: string, context?: any) {
      if (str === "std::nullopt") return { value: undefined };
      const inner = innerType.deserialize(str, context);
      if (inner === undefined || inner === null) return undefined;
      if (
        typeof inner === "object" &&
        inner !== null &&
        "value" in inner
      ) {
        return {
          value: (inner as any).value,
          scratchSpace: (inner as any).scratchSpace,
        };
      }
      return { value: inner as T };
    },
  };
}

export interface PropertyDefinition<T> {
  readonly name: string;
  readonly propertyType: PropertyType<T>;
  readonly defaultValue: T | (() => T) | string;
  readonly isLayoutProperty?: boolean;
  readonly isDisplayProperty?: boolean;
  readonly didSet?: (owner: any, value: T) => void;
}

export function defineProperty<T>(spec: {
  name: string;
  type: PropertyType<T>;
  defaultValue: T | (() => T) | string;
  isLayoutProperty?: boolean;
  isDisplayProperty?: boolean;
  didSet?: (owner: any, value: T) => void;
}): PropertyDefinition<T> {
  const def = {
    name: spec.name,
    propertyType: spec.type,
    defaultValue: spec.defaultValue,
    isLayoutProperty: !!spec.isLayoutProperty,
    isDisplayProperty: !!spec.isDisplayProperty,
    didSet: spec.didSet,
  };
  return Object.freeze(def);
}

export function glassProperties(
  specObject: Record<string, any>
): PropertyDefinition<any>[] {
  const result: PropertyDefinition<any>[] = [];
  for (const key in specObject) {
    const val = specObject[key];
    const flag = val[0];
    const type = val[1];
    const defVal = val[2];
    let isLayout = false;
    let isDisplay = false;
    if (flag === "LayoutProperty") isLayout = true;
    if (flag === "DisplayProperty") isDisplay = true;
    if (flag === "UIProperty") {
      isLayout = true;
      isDisplay = true;
    }
    result.push(
      defineProperty({
        name: key,
        type: type,
        defaultValue: defVal,
        isLayoutProperty: isLayout,
        isDisplayProperty: isDisplay,
      })
    );
  }
  return result;
}

export class SimplePropertyHolder {
  private map = new Map<
    string,
    { value: any; scratchSpace?: any; signal: Signal }
  >();

  createProperty(
    name: string,
    typeName: string,
    value: any,
    scratchSpace?: any
  ): boolean {
    if (this.map.has(name)) return false;
    this.map.set(name, { value, scratchSpace, signal: new Signal() });
    return true;
  }

  getProperty<T>(name: string): T | undefined {
    const entry = this.map.get(name);
    return entry ? entry.value : undefined;
  }

  setProperty<T>(name: string, value: T): boolean {
    const entry = this.map.get(name);
    if (!entry) return false;
    entry.value = value;
    entry.signal.emit();
    return true;
  }

  getPropertySignal(name: string): Signal {
    const entry = this.map.get(name);
    if (!entry) {
      return new Signal();
    }
    return entry.signal;
  }
}

export class HasPropertiesBase {
  _propertyHolder: SimplePropertyHolder;
  _ownsHolder: boolean;
  _trackable: Trackable;

  constructor(sharedHolder: SimplePropertyHolder | null = null) {
    if (sharedHolder) {
      this._propertyHolder = sharedHolder;
      this._ownsHolder = false;
    } else {
      this._propertyHolder = new SimplePropertyHolder();
      this._ownsHolder = true;
    }
    this._trackable = new Trackable();
  }

  _getPropertyHolder() {
    return this._propertyHolder;
  }

  _getTrackable() {
    return this._trackable;
  }

  setStyleSheet(stylesheet: any) {}
  setClassNames(classNames: string[]) {}
  getClassNames(): string[] {
    return [];
  }

  getProperty<T>(definition: PropertyDefinition<T>): T | undefined {
    return this._propertyHolder.getProperty<T>(definition.name);
  }

  setProperty<T>(definition: PropertyDefinition<T>, value: T): boolean {
    return this._propertyHolder.setProperty<T>(definition.name, value);
  }
}

export function installProperties(
  owner: any,
  propertyList: PropertyDefinition<any>[]
) {
  const holder = owner._getPropertyHolder();
  for (const def of propertyList) {
    let resolvedValue: any;
    let scratchSpace: any;

    if (typeof def.defaultValue === "function") {
      resolvedValue = def.defaultValue();
    } else if (typeof def.defaultValue === "string") {
      // String default: deserialize it
      const deserialized = def.propertyType.deserialize(def.defaultValue);
      if (
        deserialized &&
        typeof deserialized === "object" &&
        "value" in deserialized &&
        !Array.isArray(deserialized)
      ) {
        resolvedValue = (deserialized as any).value;
        scratchSpace = (deserialized as any).scratchSpace;
      } else {
        resolvedValue = deserialized;
      }
    } else {
      resolvedValue = def.defaultValue;
    }

    const created = holder.createProperty(
      def.name,
      def.propertyType.name,
      resolvedValue,
      scratchSpace
    );
    if (!created) {
      console.error(`Failed to create property ${def.name}: duplicate name.`);
      continue;
    }

    const signal = holder.getPropertySignal(def.name);
    signal.connect(owner._getTrackable(), () => {
      const current = holder.getProperty(def.name);

      if (typeof def.didSet === "function") {
        def.didSet(owner, current);
      }

      if (typeof owner.didSet === "function") {
        owner.didSet(def, current);
      }

      if (
        def.isLayoutProperty &&
        typeof owner.setNeedsLayout === "function"
      ) {
        owner.setNeedsLayout();
      }
      if (
        def.isDisplayProperty &&
        typeof owner.setNeedsDisplay === "function"
      ) {
        owner.setNeedsDisplay();
      }
    });
  }
}

export const propertySerializationMap = new Map<string, () => any>();

export function registerPropertyType(typeObject: PropertyType<any>) {
  const name = typeObject.name;
  if (propertySerializationMap.has(name)) return;
  propertySerializationMap.set(name, () => buildSerializationData(typeObject));
}

function buildSerializationData(typeObject: PropertyType<any>) {
  return {
    serializationFunction: (value: any, scratch: any) =>
      typeObject.serialize(value, scratch),
    deserializationFunction: (serializedString: string, context: any) =>
      typeObject.deserialize(serializedString, context),
  };
}

export function registerGlobalPropertyTypes(serializer: any) {
  for (const [name, factory] of propertySerializationMap.entries()) {
    const data = factory();
    if (typeof serializer.registerTypeAdvanced === "function") {
      serializer.registerTypeAdvanced(name, data);
    }
  }
}
