import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions'

export interface CloudWatchStackProps extends cdk.StackProps {
  /** Email address to receive alarm notifications */
  alarmEmail: string
}

export class CloudWatchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CloudWatchStackProps) {
    super(scope, id, props)

    // ── SNS topic ─────────────────────────────────────────────────────────
    // All alarms send to this topic. You will receive a confirmation email
    // after deployment — click the link to activate the subscription.
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName:   'event-hub-alarms',
      displayName: 'EventHub Operational Alarms',
    })
    alarmTopic.addSubscription(
      new subscriptions.EmailSubscription(props.alarmEmail),
    )

    // ── CloudWatch Log Group ──────────────────────────────────────────────
    // AWS.Logger.AspNetCore in the backend ships every ILogger call here.
    // Log Group name must match appsettings.Production.json → Logging.AWS.LogGroup
    const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName:  '/event-hub/api',
      retention:     logs.RetentionDays.THREE_MONTHS,  // 90 days, then auto-deleted
      removalPolicy: cdk.RemovalPolicy.RETAIN,         // keep logs if stack is deleted
    })

    // ── Metric Filters ────────────────────────────────────────────────────
    // Each filter scans new log lines and increments a CloudWatch metric
    // every time the pattern matches. The pattern matches the [METRIC] prefix
    // emitted by AppMetrics.cs in the backend.

    const loginFailedFilter = new logs.MetricFilter(this, 'LoginFailedFilter', {
      logGroup:        apiLogGroup,
      filterPattern:   logs.FilterPattern.literal('[METRIC] EventName=LoginFailed'),
      metricNamespace: 'EventHub/App',
      metricName:      'LoginFailures',
      metricValue:     '1',
      defaultValue:    0,
    })

    const bookingCreatedFilter = new logs.MetricFilter(this, 'BookingCreatedFilter', {
      logGroup:        apiLogGroup,
      filterPattern:   logs.FilterPattern.literal('[METRIC] EventName=BookingCreated'),
      metricNamespace: 'EventHub/App',
      metricName:      'BookingsCreated',
      metricValue:     '1',
      defaultValue:    0,
    })

    const bookingFailedFilter = new logs.MetricFilter(this, 'BookingFailedFilter', {
      logGroup:        apiLogGroup,
      filterPattern:   logs.FilterPattern.literal('[METRIC] EventName=BookingFailed'),
      metricNamespace: 'EventHub/App',
      metricName:      'BookingFailures',
      metricValue:     '1',
      defaultValue:    0,
    })

    const rateLimitFilter = new logs.MetricFilter(this, 'RateLimitFilter', {
      logGroup:        apiLogGroup,
      filterPattern:   logs.FilterPattern.literal('[METRIC] EventName=RateLimitHit'),
      metricNamespace: 'EventHub/App',
      metricName:      'RateLimitHits',
      metricValue:     '1',
      defaultValue:    0,
    })

    const payoutRequestedFilter = new logs.MetricFilter(this, 'PayoutRequestedFilter', {
      logGroup:        apiLogGroup,
      filterPattern:   logs.FilterPattern.literal('[METRIC] EventName=PayoutRequested'),
      metricNamespace: 'EventHub/App',
      metricName:      'PayoutsRequested',
      metricValue:     '1',
      defaultValue:    0,
    })

    // ── Alarms ────────────────────────────────────────────────────────────
    const alarmAction = new actions.SnsAction(alarmTopic)

    // Login failure spike — possible brute-force / credential stuffing
    new cloudwatch.Alarm(this, 'LoginFailuresAlarm', {
      alarmName:          'EventHub-App-LoginFailures',
      alarmDescription:   '> 20 login failures in 5 min — possible brute-force attack.',
      metric: loginFailedFilter.metric({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
      threshold:          20,
      evaluationPeriods:  1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData:   cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(alarmAction)

    // Rate limit surge — aggressive scraping or abuse
    new cloudwatch.Alarm(this, 'RateLimitHitsAlarm', {
      alarmName:          'EventHub-App-RateLimitHits',
      alarmDescription:   '> 100 rate-limit rejections in 5 min — possible scraping or abuse.',
      metric: rateLimitFilter.metric({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
      threshold:          100,
      evaluationPeriods:  1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData:   cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(alarmAction)

    // Booking failure spike — possible application bug
    new cloudwatch.Alarm(this, 'BookingFailuresAlarm', {
      alarmName:          'EventHub-App-BookingFailures',
      alarmDescription:   '> 30 booking failures in 5 min — possible application error.',
      metric: bookingFailedFilter.metric({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
      threshold:          30,
      evaluationPeriods:  1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData:   cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(alarmAction)

    // ── Dashboard ─────────────────────────────────────────────────────────
    new cloudwatch.Dashboard(this, 'EventHubDashboard', {
      dashboardName: 'EventHub-Operations',
      widgets: [

        // Row 1: Booking funnel
        [
          new cloudwatch.GraphWidget({
            title:  'Bookings — Created vs Failed',
            width:  12,
            height: 6,
            left: [
              bookingCreatedFilter.metric({ statistic: 'Sum', period: cdk.Duration.minutes(5), label: 'Created', color: '#2ca02c' }),
              bookingFailedFilter.metric({  statistic: 'Sum', period: cdk.Duration.minutes(5), label: 'Failed',  color: '#d62728' }),
            ],
          }),

          new cloudwatch.GraphWidget({
            title:  'Auth — Login Failures',
            width:  12,
            height: 6,
            left: [
              loginFailedFilter.metric({ statistic: 'Sum', period: cdk.Duration.minutes(5), label: 'Login Failures', color: '#ff7f0e' }),
            ],
          }),
        ],

        // Row 2: Security + payouts
        [
          new cloudwatch.GraphWidget({
            title:  'Rate Limit Hits',
            width:  8,
            height: 6,
            left: [
              rateLimitFilter.metric({ statistic: 'Sum', period: cdk.Duration.minutes(5), label: 'Rate Limit Hits', color: '#9467bd' }),
            ],
          }),

          new cloudwatch.GraphWidget({
            title:  'Payout Requests',
            width:  8,
            height: 6,
            left: [
              payoutRequestedFilter.metric({ statistic: 'Sum', period: cdk.Duration.hours(1), label: 'Payouts Requested', color: '#17becf' }),
            ],
          }),

          new cloudwatch.TextWidget({
            width:  8,
            height: 6,
            markdown: `## Useful Log Insights Queries
Run these in the \`/event-hub/api\` log group.

**Recent login failures**
\`\`\`
fields @timestamp, Email, Reason
| filter @message like 'LoginFailed'
| sort @timestamp desc | limit 50
\`\`\`
**Booking funnel**
\`\`\`
fields @timestamp, EventName
| filter @message like '[METRIC]'
| stats count() as n by EventName
\`\`\`
**Trace a request**
\`\`\`
fields @timestamp, @message
| filter CorrelationId = '<id>'
| sort @timestamp asc
\`\`\``,
          }),
        ],

      ],
    })

    // ── Outputs ───────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiLogGroupName', {
      value:       apiLogGroup.logGroupName,
      exportName:  'EventHubApiLogGroup',
      description: 'CloudWatch Log Group where the API ships its logs',
    })
    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value:       alarmTopic.topicArn,
      exportName:  'EventHubAlarmTopic',
      description: 'SNS topic ARN — subscribe additional emails here if needed',
    })
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value:       `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=EventHub-Operations`,
      description: 'Direct link to the EventHub Operations dashboard',
    })
  }
}
