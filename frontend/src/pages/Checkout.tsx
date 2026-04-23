import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Skeleton, Space, Typography, message } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchPayment,
  submitGatewayCallback,
  type PaymentOutcome,
  type PaymentRow,
} from '@/services/payment';
import { formatCNY } from '@/utils/format';

const SIG_STORAGE_PREFIX = 'mini-mall.paySigs.';

interface StoredSigs {
  amount: number;
  signatures: Record<PaymentOutcome, string>;
}

/**
 * Look up the sandbox signatures for this payment — they were stashed in
 * sessionStorage by the button that fired the pay-intent. A page refresh
 * would clear them, which is fine: we surface a friendly error rather than
 * silently failing.
 */
function loadStoredSigs(paymentId: string): StoredSigs | null {
  try {
    const raw = sessionStorage.getItem(SIG_STORAGE_PREFIX + paymentId);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSigs;
  } catch {
    return null;
  }
}

export default function Checkout(): JSX.Element {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pid = params.get('pid');
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pid) return;
    void (async () => {
      try {
        setPayment(await fetchPayment(Number(pid)));
      } catch {
        setError('支付流水不存在或无权查看');
      }
    })();
  }, [pid]);

  if (!pid) {
    return <Alert type="error" message="缺少 pid 参数" />;
  }
  if (error) {
    return <Alert type="error" message={error} />;
  }
  if (!payment) {
    return (
      <Card style={{ maxWidth: 560 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  if (payment.status !== 'pending') {
    return (
      <div>
        <h1 className="page-title">模拟支付</h1>
        <Alert
          type="info"
          message={`该支付已处理（${payment.status}），请返回订单页查看。`}
          action={
            <Button size="small" onClick={() => navigate('/orders')}>
              返回订单
            </Button>
          }
        />
      </div>
    );
  }

  const sigs = loadStoredSigs(pid);

  const handleOutcome = async (outcome: PaymentOutcome): Promise<void> => {
    if (!sigs) {
      message.error('支付会话已过期，请回到订单页重新发起支付');
      return;
    }
    setLoading(true);
    try {
      const result = await submitGatewayCallback(
        payment.id,
        outcome,
        sigs.amount,
        sigs.signatures[outcome],
      );
      sessionStorage.removeItem(SIG_STORAGE_PREFIX + pid);
      if (result.status === 'success') {
        message.success(`支付成功（流水号 ${result.gatewayTxId}）`);
      } else if (result.status === 'failed') {
        message.warning('支付失败');
      } else {
        message.info('已取消支付');
      }
      navigate('/orders');
    } catch {
      // http interceptor already surfaced the error toast
    } finally {
      setLoading(false);
    }
  };

  const methodLabel =
    payment.method === 'alipay_sandbox' ? '支付宝（沙箱）' : '微信支付（沙箱）';

  return (
    <div>
      <h1 className="page-title">模拟支付</h1>
      <Card style={{ maxWidth: 560 }}>
        <Descriptions column={1} size="small" style={{ marginBottom: 24 }}>
          <Descriptions.Item label="订单号">#{payment.orderId}</Descriptions.Item>
          <Descriptions.Item label="支付方式">{methodLabel}</Descriptions.Item>
          <Descriptions.Item label="金额">
            <Typography.Text strong style={{ color: '#1677ff', fontSize: 20 }}>
              {formatCNY(payment.amount)}
            </Typography.Text>
          </Descriptions.Item>
        </Descriptions>

        {!sigs && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="沙箱会话已过期"
            description="刷新或外部跳转会清除用于签名的临时数据。请回到订单页，重新点击「支付」。"
          />
        )}

        <Typography.Paragraph type="secondary">
          这是沙箱模式：不会发生真实扣款。挑一个结果来完成回调。
        </Typography.Paragraph>

        <Space wrap>
          <Button
            type="primary"
            size="large"
            loading={loading}
            disabled={!sigs}
            onClick={() => void handleOutcome('success')}
          >
            模拟支付成功
          </Button>
          <Button danger size="large" loading={loading} disabled={!sigs} onClick={() => void handleOutcome('failed')}>
            模拟支付失败
          </Button>
          <Button size="large" loading={loading} disabled={!sigs} onClick={() => void handleOutcome('cancelled')}>
            用户取消
          </Button>
        </Space>
      </Card>
    </div>
  );
}

/** Exposed so OrderList can stash signatures keyed by paymentId. */
export function stashPaymentSignatures(
  paymentId: number,
  amount: number,
  signatures: Record<PaymentOutcome, string>,
): void {
  sessionStorage.setItem(
    SIG_STORAGE_PREFIX + paymentId,
    JSON.stringify({ amount, signatures } satisfies StoredSigs),
  );
}
