import * as grpc from "npm:@grpc/grpc-js";
import * as protoLoader from "npm:@grpc/proto-loader";

/**
 * Safe utility to walk a nested object path.
 */
function getNestedProperty<T>(
  obj: unknown,
  path: string,
): T | undefined {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj) as T | undefined;
}

/**
 * Create a typed GRPC client.
 */
export function createGrpcClient<TClient>(
  protoPath: string,
  packageName: string,
  serviceName: string,
  socketPath: string,
): TClient {
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

  // Get the service constructor
  const serviceCtor = getNestedProperty<
    new (...args: ConstructorParameters<typeof grpc.Client>) => TClient
  >(protoDescriptor, `${packageName}.${serviceName}`);

  if (!serviceCtor) {
    throw new Error(
      `Service constructor not found for path ${packageName}.${serviceName}`,
    );
  }

  // Instantiate the typed client
  return new serviceCtor(
    `unix://${socketPath}`,
    grpc.credentials.createInsecure(),
  );
}

/**
 * Typed GRPC request/response (calls the method directly)
 */
export function grpcRequest<TRequest, TResponse>(
  method: (
    req: TRequest,
    cb: (err: Error | null, resp: TResponse) => void,
  ) => void,
  requestData: TRequest,
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    method(requestData, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}
