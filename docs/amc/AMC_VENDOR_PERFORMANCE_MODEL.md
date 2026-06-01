# AMC Vendor Performance Model

## Purpose

The AMC Vendor Performance Model defines the signals Falcon may use to evaluate vendor reliability, quality, capacity, and operational risk.

Vendor performance should support assignment decisions, reporting, and operational visibility without creating a separate AMC platform.

## Metrics

Potential vendor metrics include:

- acceptance rate
- completion rate
- average turn time
- revision rate
- active workload
- recent assignment count
- client satisfaction
- quality/review issues
- responsiveness

## Performance Score Inputs

Performance scoring may combine:

- completed assignments
- declined assignments
- missed deadlines
- revision requests
- review issues
- average response time
- average delivery time
- relationship history
- client feedback

MVP does not need a complete score. Early implementation can expose raw metrics and defer scoring.

## Capacity Signals

Capacity signals may include:

- active assigned orders
- due-soon orders
- overdue orders
- recent assignment count
- vendor-declared capacity
- blackout/unavailable dates

Capacity should eventually help avoid overloading the same vendor repeatedly.

## Relationship Signals

Relationship signals may include:

- prior assignments with the AMC
- client-specific vendor history
- preferred vendor status
- do-not-use flags
- recent successful assignments
- responsiveness trend

## Risk Signals

Risk signals may include:

- late delivery history
- high revision rate
- low acceptance rate
- no recent response
- coverage mismatch
- quality/review concerns
- overloaded active workload

Risk should be surfaced early enough to help users make better assignment decisions.

## Use in Assignment Engine

The assignment engine may use performance, capacity, relationship, and risk signals to rank eligible vendors.

Falcon should make recommendations explainable: users should understand why a vendor is suggested or flagged.

## Reporting

Vendor performance reporting may include:

- orders by vendor
- average turn time
- acceptance rate
- completion rate
- revision rate
- overdue count
- margin by vendor
- client/vendor performance comparisons

## Future Expansion

- configurable score weights
- client-specific vendor scorecards
- vendor capacity forecasting
- automated risk alerts
- trend analysis
- vendor portal self-service metrics
- margin-adjusted vendor performance
