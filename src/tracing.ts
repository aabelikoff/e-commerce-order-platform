import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const isTracingEnabled = (process.env.OTEL_ENABLED ?? 'false') === 'true';

if (isTracingEnabled) {
  const diagnosticsEnabled =
    (process.env.OTEL_DIAGNOSTICS_ENABLED ?? 'false') === 'true';

  if (diagnosticsEnabled) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'ecommerce-service',
    traceExporter: new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
        'http://localhost:4318/v1/traces',
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
  });

  sdk.start();

  const shutdownTracing = async () => {
    try {
      await sdk.shutdown();
    } catch (error) {
      console.error('OpenTelemetry shutdown failed', error);
    }
  };

  process.once('SIGTERM', () => {
    void shutdownTracing();
  });

  process.once('SIGINT', () => {
    void shutdownTracing();
  });
}
