import urllib.request
import json
import time

base = 'http://localhost:8000/api/v1'

def run_suite():
    audit_results = {}
    
    # 1. POST /api/v1/contacts
    contact_data = {
        'full_name': 'Automated QA Lead',
        'email': 'qalead@zigmaacrm.io',
        'phone': '+919988776655',
        'company_name': 'Zigmaa Global Tech',
        'source': 'MANUAL',
        'status': 'NEW',
        'lifecycle_stage': 'NEW',
        'custom_data': {'industry': 'SaaS CRM', 'score': 95}
    }
    t0 = time.time()
    req = urllib.request.Request(f'{base}/contacts', data=json.dumps(contact_data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req, timeout=10)
    body = json.loads(res.read().decode('utf-8'))
    t_post = round((time.time() - t0) * 1000, 2)
    audit_results['crud_post'] = {'status': res.getcode(), 'latency_ms': t_post, 'id': body.get('id')}
    created_id = body.get('id')

    # 2. GET /api/v1/contacts
    t0 = time.time()
    res_get = urllib.request.urlopen(f'{base}/contacts', timeout=10)
    contacts = json.loads(res_get.read().decode('utf-8'))
    t_get = round((time.time() - t0) * 1000, 2)
    found_post = any(c.get('id') == created_id for c in contacts)
    is_desc = True
    if len(contacts) > 1:
        dates = [c.get('created_at') for c in contacts if c.get('created_at')]
        is_desc = dates == sorted(dates, reverse=True)
    audit_results['crud_get'] = {'status': res_get.getcode(), 'latency_ms': t_get, 'total_count': len(contacts), 'found_created': found_post, 'sorted_desc': is_desc}

    # 3. Webhook Inbound Lead
    webhook_data = {
        'full_name': 'Antigravity Meta Lead',
        'phone': '+919876500001',
        'email': 'meta_lead@zigmaatest.com',
        'company_name': 'Meta Test Corp',
        'source': 'META_ADS',
        'custom_data': {'ad_campaign': 'Q4 Chennai Launch'}
    }
    t0 = time.time()
    req_wh = urllib.request.Request(f'{base}/webhooks/inbound-lead', data=json.dumps(webhook_data).encode('utf-8'), headers={'Content-Type': 'application/json', 'Origin': 'https://meta-landing-page.com'})
    res_wh = urllib.request.urlopen(req_wh, timeout=10)
    wh_body = json.loads(res_wh.read().decode('utf-8'))
    t_wh = round((time.time() - t0) * 1000, 2)
    audit_results['webhook_initial'] = {'status': res_wh.getcode(), 'latency_ms': t_wh, 'body': wh_body}

    # 4. Duplicate Inbound Lead
    t0 = time.time()
    req_dup = urllib.request.Request(f'{base}/webhooks/inbound-lead', data=json.dumps(webhook_data).encode('utf-8'), headers={'Content-Type': 'application/json', 'Origin': 'https://meta-landing-page.com'})
    res_dup = urllib.request.urlopen(req_dup, timeout=10)
    dup_body = json.loads(res_dup.read().decode('utf-8'))
    t_dup = round((time.time() - t0) * 1000, 2)
    audit_results['webhook_duplicate'] = {'status': res_dup.getcode(), 'latency_ms': t_dup, 'body': dup_body}

    # 5. Check contact detail & activities
    t0 = time.time()
    meta_cid = wh_body.get('contact_id')
    res_det = urllib.request.urlopen(f'{base}/contacts/{meta_cid}', timeout=10)
    det_body = json.loads(res_det.read().decode('utf-8'))
    t_det = round((time.time() - t0) * 1000, 2)
    audit_results['contact_detail_activities'] = {
        'status': res_det.getcode(),
        'latency_ms': t_det,
        'lifecycle_stage': det_body.get('lifecycle_stage'),
        'activities_count': len(det_body.get('activities', [])),
        'activities': det_body.get('activities', [])
    }

    # 6. Test Send Email Endpoint
    email_payload = {'subject': 'Welcome to Zigmaa CRM Audit', 'body': 'Automated testing email body verification.'}
    t0 = time.time()
    req_email = urllib.request.Request(f'{base}/contacts/{created_id}/send-email', data=json.dumps(email_payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    res_email = urllib.request.urlopen(req_email, timeout=10)
    email_body = json.loads(res_email.read().decode('utf-8'))
    t_email = round((time.time() - t0) * 1000, 2)
    audit_results['send_email'] = {'status': res_email.getcode(), 'latency_ms': t_email, 'body': email_body}

    print(json.dumps(audit_results, indent=2))

if __name__ == '__main__':
    run_suite()
