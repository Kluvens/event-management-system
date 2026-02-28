import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as wafv2 from 'aws-cdk-lib/aws-wafv2'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions'

export interface WafCloudWatchStackProps extends cdk.StackProps {
  /** ARN of the ALB that fronts your ECS Fargate service */
  albArn: string
  /** Email address to receive alarm notifications */
  alarmEmail: string
}

export class WafCloudWatchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WafCloudWatchStackProps) {
    super(scope, id, props)

    // ── SNS topic for alarm notifications ─────────────────────────────────
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: 'event-hub-alarms',
      displayName: 'EventHub Operational Alarms',
    })
    alarmTopic.addSubscription(
      new subscriptions.EmailSubscription(props.alarmEmail),
    )

    // ── CloudWatch Log Group for the API ──────────────────────────────────
    // This is where AWS.Logger.AspNetCore ships ILogger output to.
    const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName:  '/event-hub/api',
      retention:     logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // ── Metric filters on the log group ───────────────────────────────────
    // These turn structured log lines emitted by AppMetrics into proper
    // CloudWatch custom metrics that can power alarms and dashboards.

    const loginFailedFilter = new logs.MetricFilter(this, 'LoginFailedFilter', {
      logGroup:     apiLogGroup,
      filterPattern: logs.FilterPattern.literal('[METRIC] EventName=LoginFailed'),
      metricNamespace: 'EventHub/App',
      metricName:      'LoginFailures',
      metricValue:     '1',
      defaultValue:    0,
    })

    const bookingCreatedFilter = new logs.MetricFilter(this, 'BookingCreatedFilter', {
      logGroup:     apiLogGroup,
      filterPattern: logs.FilterPattern.literal('[METRIC] EventName=BookingCreated'),
      metricNamespace: 'EventHub/App',
      metricName:      'BookingsCreated',
      metricValue:     '1',
      defaultValue:    0,
    })

    const bookingFailedFilter = new logs.MetricFilter(this, 'BookingFailedFilter', {
      logGroup:     apiLogGroup,
      filterPattern: logs.FilterPattern.literal('[METRIC] EventName=BookingFailed'),
      metricNamespace: 'EventHub/App',
      metricName:      'BookingFailures',
      metricValue:     '1',
      defaultValue:    0,
    })

    const rateLimitFilter = new logs.MetricFilter(this, 'RateLimitFilter', {
      logGroup:     apiLogGroup,
      filterPattern: logs.FilterPattern.literal('[METRIC] EventName=RateLimitHit'),
      metricNamespace: 'EventHub/App',
      metricName:      'RateLimitHits',
      metricValue:     '1',
      defaultValue:    0,
    })

    const payoutRequestedFilter = new logs.MetricFilter(this, 'PayoutRequestedFilter', {
      logGroup:     apiLogGroup,
      filterPattern: logs.FilterPattern.literal('[METRIC] EventName=PayoutRequested'),
      metricNamespace: 'EventHub/App',
      metricName:      'PayoutsRequested',
      metricValue:     '1',
      defaultValue:    0,
    })

    // ── WAF WebACL ────────────────────────────────────────────────────────
    // Attached to the ALB in REGIONAL scope (ap-southeast-2).
    // For CloudFront use scope: 'CLOUDFRONT' and deploy to us-east-1.
    const webAcl = new wafv2.CfnWebACL(this, 'ApiWebAcl', {
      name:          'event-hub-api-acl',
      scope:         'REGIONAL',
      defaultAction: { allow: {} },

      rules: [
        // ── 1. AWS Managed — Common Rule Set (OWASP top 10 basics) ───────
        // Covers: path traversal, HTTP protocol anomalies, bad user agents,
        // oversized requests, SSRF, restricted paths, PHP/Unix injection.
        {
          name:     'AWSManagedRulesCommonRuleSet',
          priority: 10,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name:       'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName:               'CommonRules',
            sampledRequestsEnabled:   true,
          },
        },

        // ── 2. AWS Managed — Known Bad Inputs ────────────────────────────
        // Blocks log4j / Log4Shell, XSS in query strings, template injection.
        {
          name:     'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 20,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name:       'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName:               'KnownBadInputs',
            sampledRequestsEnabled:   true,
          },
        },

        // ── 3. AWS Managed — SQL Injection ───────────────────────────────
        // Extra SQL-injection detection on top of what CommonRuleSet provides.
        {
          name:     'AWSManagedRulesSQLiRuleSet',
          priority: 30,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name:       'AWSManagedRulesSQLiRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName:               'SQLiRules',
            sampledRequestsEnabled:   true,
          },
        },

        // ── 4. AWS Managed — IP Reputation List ──────────────────────────
        // Blocks IPs on AWS threat intelligence lists (TOR nodes, scanners,
        // botnets) without any maintenance on your part.
        {
          name:     'AWSManagedRulesAmazonIpReputationList',
          priority: 40,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name:       'AWSManagedRulesAmazonIpReputationList',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName:               'IpReputation',
            sampledRequestsEnabled:   true,
          },
        },

        // ── 5. Custom rate-based rule ────────────────────────────────────
        // Hard cap of 1 000 requests per 5 minutes per source IP at the
        // WAF/ALB layer — complements the application-level rate limiter.
        {
          name:     'PerIpRateLimit',
          priority: 50,
          action:   { block: {} },
          statement: {
            rateBasedStatement: {
              limit:            1000,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName:               'PerIpRateLimit',
            sampledRequestsEnabled:   true,
          },
        },
      ],

      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName:               'EventHubWAF',
        sampledRequestsEnabled:   true,
      },
    })

    // Associate WAF with the ALB (skip if albArn is empty during synth)
    if (props.albArn) {
      new wafv2.CfnWebACLAssociation(this, 'WebAclAlbAssociation', {
        resourceArn: props.albArn,
        webAclArn:   webAcl.attrArn,
      })
    }

    // ── CloudWatch Alarms ─────────────────────────────────────────────────

    const alarmAction = new actions.SnsAction(alarmTopic)

    // 1. WAF — blocked requests spike
    //    Fires when > 50 requests are blocked in any 5-minute window.
    //    Could indicate an active attack or a false-positive surge.
    new cloudwatch.Alarm(this, 'WafBlockedRequestsAlarm', {
      alarmName:          'EventHub-WAF-BlockedRequests',
      alarmDescription:   'WAF blocked > 50 requests in 5 min — possible attack or false-positive wave.',
      metric: new cloudwatch.Metric({
        namespace:  'AWS/WAFV2',
        metricName: 'BlockedRequests',
        dimensionsMap: { WebACL: 'event-hub-api-acl', Region: this.region, Rule: 'ALL' },
        statistic:  'Sum',
        period:     cdk.Duration.minutes(5),
      }),
      threshold:          50,
      evaluationPeriods:  1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData:   cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(alarmAction)

    // 2. Application — login failure spike
    //    > 20 failed logins in 5 min may indicate brute-force / credential stuffing.
    new cloudwatch.Alarm(this, 'LoginFailuresAlarm', {
      alarmName:          'EventHub-App-LoginFailures',
      alarmDescription:   'More than 20 login failures in 5 min — possible brute-force attack.',
      metric: loginFailedFilter.metric({
        statistic: 'Sum',
        period:    cdk.Duration.minutes(5),
      }),
      threshold:          20,
      evaluationPeriods:  1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData:   cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(alarmAction)

    // 3. Application — rate limit hit surge
    //    > 100 rate-limit rejections in 5 min = aggressive scraping or abuse.
    new cloudwatch.Alarm(this, 'RateLimitHitsAlarm', {
      alarmName:          'EventHub-App-RateLimitHits',
      alarmDescription:   'Rate limiter rejected > 100 requests in 5 min — possible scraping or abuse.',
      metric: rateLimitFilter.metric({
        statistic: 'Sum',
        period:    cdk.Duration.minutes(5),
      }),
      threshold:          100,
      evaluationPeriods:  1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData:   cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(alarmAction)

    // 4. Application — booking failure rate
    //    If more bookings fail than succeed in 5 min something is broken.
    new cloudwatch.Alarm(this, 'BookingFailureRateAlarm', {
      alarmName:          'EventHub-App-BookingFailures',
      alarmDescription:   'More than 30 booking failures in 5 min — possible application error.',
      metric: bookingFailedFilter.metric({
        statistic: 'Sum',
        period:    cdk.Duration.minutes(5),
      }),
      threshold:          30,
      evaluationPeriods:  1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData:   cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(alarmAction)

    // ── CloudWatch Dashboard ───────────────────────────────────────────────
    new cloudwatch.Dashboard(this, 'EventHubDashboard', {
      dashboardName: 'EventHub-Operations',
      widgets: [

        // Row 1: Security overview
        [
          new cloudwatch.GraphWidget({
            title:  'WAF — Allowed vs Blocked Requests',
            width:  12,
            height: 6,
            left: [
              new cloudwatch.Metric({
                namespace:  'AWS/WAFV2',
                metricName: 'AllowedRequests',
                dimensionsMap: { WebACL: 'event-hub-api-acl', Region: this.region, Rule: 'ALL' },
                statistic:  'Sum',
                period:     cdk.Duration.minutes(5),
                label:      'Allowed',
                color:      '#2ca02c',
              }),
            ],
            right: [
              new cloudwatch.Metric({
                namespace:  'AWS/WAFV2',
                metricName: 'BlockedRequests',
                dimensionsMap: { WebACL: 'event-hub-api-acl', Region: this.region, Rule: 'ALL' },
                statistic:  'Sum',
                period:     cdk.Duration.minutes(5),
                label:      'Blocked',
                color:      '#d62728',
              }),
            ],
          }),

          new cloudwatch.GraphWidget({
            title:  'WAF — Blocks by Rule Group',
            width:  12,
            height: 6,
            left: [
              new cloudwatch.Metric({ namespace: 'AWS/WAFV2', metricName: 'BlockedRequests', dimensionsMap: { WebACL: 'event-hub-api-acl', Region: this.region, Rule: 'CommonRules' },   statistic: 'Sum', period: cdk.Duration.minutes(5), label: 'Common' }),
              new cloudwatch.Metric({ namespace: 'AWS/WAFV2', metricName: 'BlockedRequests', dimensionsMap: { WebACL: 'event-hub-api-acl', Region: this.region, Rule: 'SQLiRules' },    statistic: 'Sum', period: cdk.Duration.minutes(5), label: 'SQLi' }),
              new cloudwatch.Metric({ namespace: 'AWS/WAFV2', metricName: 'BlockedRequests', dimensionsMap: { WebACL: 'event-hub-api-acl', Region: this.region, Rule: 'IpReputation' }, statistic: 'Sum', period: cdk.Duration.minutes(5), label: 'IP Reputation' }),
              new cloudwatch.Metric({ namespace: 'AWS/WAFV2', metricName: 'BlockedRequests', dimensionsMap: { WebACL: 'event-hub-api-acl', Region: this.region, Rule: 'PerIpRateLimit' }, statistic: 'Sum', period: cdk.Duration.minutes(5), label: 'Rate Limit' }),
            ],
          }),
        ],

        // Row 2: Application business metrics
        [
          new cloudwatch.GraphWidget({
            title:  'Bookings — Created vs Failed',
            width:  8,
            height: 6,
            left: [
              bookingCreatedFilter.metric({ statistic: 'Sum', period: cdk.Duration.minutes(5), label: 'Created', color: '#2ca02c' }),
              bookingFailedFilter.metric({  statistic: 'Sum', period: cdk.Duration.minutes(5), label: 'Failed',  color: '#d62728' }),
            ],
          }),

          new cloudwatch.GraphWidget({
            title:  'Auth — Login Failures',
            width:  8,
            height: 6,
            left: [
              loginFailedFilter.metric({ statistic: 'Sum', period: cdk.Duration.minutes(5), label: 'Login Failures', color: '#ff7f0e' }),
            ],
          }),

          new cloudwatch.GraphWidget({
            title:  'Rate Limit Hits',
            width:  8,
            height: 6,
            left: [
              rateLimitFilter.metric({ statistic: 'Sum', period: cdk.Duration.minutes(5), label: 'Rate Limit Hits', color: '#9467bd' }),
            ],
          }),
        ],

        // Row 3: Payouts + text summary
        [
          new cloudwatch.GraphWidget({
            title:  'Payout Requests',
            width:  8,
            height: 6,
            left: [
              payoutRequestedFilter.metric({ statistic: 'Sum', period: cdk.Duration.hours(1), label: 'Payouts Requested', color: '#17becf' }),
            ],
          }),

          new cloudwatch.TextWidget({
            markdown: `## EventHub Operations Dashboard

**Log Insights** — Run in the \`/event-hub/api\` log group:

\`\`\`
# Recent login failures
fields @timestamp, Email, Reason
| filter @message like '[METRIC] EventName=LoginFailed'
| sort @timestamp desc | limit 50

# Booking funnel (last 1h)
filter @message like '[METRIC] EventName=Booking'
| stats count() as total by EventName
\`\`\`

**Alarm thresholds:**
- WAF blocked > 50 / 5 min → SNS
- Login failures > 20 / 5 min → SNS
- Rate limit hits > 100 / 5 min → SNS
- Booking failures > 30 / 5 min → SNS`,
            width:  16,
            height: 6,
          }),
        ],
      ],
    })

    // ── Outputs ───────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'WebAclArn',        { value: webAcl.attrArn,          exportName: 'EventHubWebAclArn'    })
    new cdk.CfnOutput(this, 'ApiLogGroupName',  { value: apiLogGroup.logGroupName, exportName: 'EventHubApiLogGroup'  })
    new cdk.CfnOutput(this, 'AlarmTopicArn',    { value: alarmTopic.topicArn,      exportName: 'EventHubAlarmTopic'   })
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=EventHub-Operations`,
    })
  }
}
