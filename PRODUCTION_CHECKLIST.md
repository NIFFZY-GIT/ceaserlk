# Production Deployment Checklist

## ✅ PayHere Production Configuration

### 1. Update Environment Variables in `.env.local`

Replace these placeholders with your actual PayHere production credentials:

```env
# Get these from https://www.payhere.lk/merchant/settings
PAYHERE_MERCHANT_ID=YOUR_PRODUCTION_MERCHANT_ID
PAYHERE_MERCHANT_SECRET=YOUR_PRODUCTION_MERCHANT_SECRET
PAYHERE_SANDBOX=false
```

### 2. Update Production URL

```env
NEXT_PUBLIC_APP_URL="https://www.inceasar.com"
```

### 3. Verify PayHere Settings
- ✅ `PAYHERE_SANDBOX=false` (Production mode enabled)
- ✅ PayHere production endpoint configured: `https://www.payhere.lk`
- ✅ Return URL: `https://www.inceasar.com/order-confirmation`
- ✅ Notify URL configured in PayHere dashboard
- ✅ Cancel URL handled properly

---

## 🔒 Security Checklist

### Environment Variables
- [ ] All production credentials updated in `.env.local`
- [ ] Never commit `.env.local` to version control
- [ ] Use environment variables in production hosting (Vercel/AWS/etc.)
- [ ] Rotate JWT_SECRET if previously exposed
- [ ] Verify CRON_SECRET is strong and unique

### Database
- [ ] Production database configured with proper connection pooling
- [ ] Database backups enabled
- [ ] SSL/TLS enabled for database connections
- [ ] Regular backup schedule configured

### Email
- [ ] Production email credentials configured
- [ ] Email sending limits checked with provider
- [ ] SPF/DKIM records configured for domain
- [ ] Test email delivery to all major providers

---

## 🚀 PayHere Production Steps

### Before Going Live

1. **Log in to PayHere Merchant Dashboard**
   - URL: https://www.payhere.lk/merchant/

2. **Get Production Credentials**
   - Navigate to Settings → API Credentials
   - Copy your Merchant ID
   - Copy your Merchant Secret
   - Update `.env.local` with these values

3. **Configure Webhook/Notify URL**
   - In PayHere dashboard, set Notify URL to:
     ```
     https://www.inceasar.com/api/checkout/payhere/notify
     ```

4. **Configure Return URLs**
   - Success URL: `https://www.inceasar.com/order-confirmation`
   - Cancel URL: `https://www.inceasar.com/checkout`

5. **Test in Production**
   - Make a small test purchase (minimum amount)
   - Verify order is created in database
   - Check email notifications are sent
   - Confirm payment appears in PayHere dashboard

---

## 🌐 Domain & Hosting

### DNS Configuration
- [ ] Domain pointed to production server
- [ ] SSL certificate installed and valid
- [ ] HTTPS redirects configured
- [ ] www redirect configured (if applicable)

### Next.js Deployment
- [ ] Build successful: `npm run build`
- [ ] No build warnings or errors
- [ ] Environment variables configured in hosting platform
- [ ] Production optimizations enabled
- [ ] CDN configured for static assets (if applicable)

---

## 📊 Monitoring & Analytics

### Error Tracking
- [ ] Error logging configured (Sentry, LogRocket, etc.)
- [ ] Payment failures tracked
- [ ] API errors monitored

### Performance
- [ ] Core Web Vitals optimized
- [ ] Image optimization enabled
- [ ] Database query performance reviewed
- [ ] API response times acceptable

---

## 💳 Payment Testing Checklist

### Before Launch
- [ ] Test card payment flow end-to-end
- [ ] Test Cash on Delivery (COD) flow
- [ ] Verify free delivery promo works correctly
- [ ] Test payment failure scenarios
- [ ] Test payment cancellation flow
- [ ] Verify order emails are sent correctly
- [ ] Check order confirmation page displays properly
- [ ] Verify PayHere webhook processes correctly

### PayHere Integration Verification
- [ ] Hash generation works correctly
- [ ] Order IDs are unique
- [ ] Amount formatting correct (2 decimal places)
- [ ] Currency set to LKR
- [ ] Customer details passed correctly
- [ ] Shipping address captured properly

---

## 📧 Email Configuration

### Production Email Setup
```env
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=contactus@inceasar.com
EMAIL_FROM_NAME=CEASAR
```

### Verify
- [ ] Order confirmation emails working
- [ ] Admin notification emails working
- [ ] Password reset emails working
- [ ] Email templates display correctly
- [ ] Email deliverability tested

---

## 🗄️ Database Checklist

### Production Database
- [ ] Connection string uses production database
- [ ] Connection pooling configured
- [ ] Indexes created for common queries
- [ ] Foreign keys and constraints in place
- [ ] Backup strategy implemented

### Tables Required
- [ ] `pending_payhere_orders` table exists
- [ ] Order tables have proper columns
- [ ] User tables configured correctly
- [ ] Product tables optimized

---

## 🔐 API Security

### Rate Limiting
- [ ] Rate limiting implemented on sensitive endpoints
- [ ] CORS configured correctly for production domain
- [ ] CSP headers include PayHere production domain

### Authentication
- [ ] JWT tokens properly validated
- [ ] Session management configured
- [ ] Google OAuth production credentials configured

---

## 📱 Frontend Checklist

### User Experience
- [ ] All forms validated properly
- [ ] Loading states shown during payment
- [ ] Error messages clear and helpful
- [ ] Mobile responsive design tested
- [ ] Cross-browser compatibility verified

### Performance
- [ ] Images optimized and lazy-loaded
- [ ] Code splitting implemented
- [ ] Bundle size optimized
- [ ] Lighthouse score > 90

---

## 🧪 Final Testing

### Critical User Flows
1. [ ] Browse products → Add to cart → Checkout → Pay with PayHere → Order confirmation
2. [ ] Create account → Login → Make purchase → Track order
3. [ ] Apply free delivery promo → Complete order
4. [ ] Cash on Delivery order flow
5. [ ] Password reset flow
6. [ ] Admin dashboard access and order management

### Error Scenarios
- [ ] Payment declined handling
- [ ] Payment timeout handling
- [ ] Network error during payment
- [ ] Duplicate order prevention
- [ ] Out of stock handling

---

## 🚦 Launch Day

### Pre-Launch
1. [ ] All checklist items completed
2. [ ] Stakeholders notified
3. [ ] Support team briefed
4. [ ] Monitoring dashboards ready
5. [ ] Rollback plan documented

### Post-Launch
1. [ ] Monitor error rates
2. [ ] Watch payment success rate
3. [ ] Check server performance
4. [ ] Verify email delivery
5. [ ] Monitor user feedback

---

## 📞 Support Contacts

- **PayHere Support**: support@payhere.lk
- **PayHere Hotline**: +94 11 2 385 385
- **Documentation**: https://support.payhere.lk

---

## 🔄 Regular Maintenance

### Daily
- [ ] Check payment success rate
- [ ] Monitor error logs
- [ ] Review failed orders

### Weekly
- [ ] Database backup verification
- [ ] Security updates
- [ ] Performance metrics review

### Monthly
- [ ] SSL certificate expiry check
- [ ] Dependency updates
- [ ] Security audit
- [ ] Analytics review

---

## ⚠️ Important Notes

1. **Never use sandbox credentials in production**
2. **Always test with small amounts first**
3. **Keep merchant secret secure - never expose in client code**
4. **Monitor PayHere dashboard for payment anomalies**
5. **Have a rollback plan ready**
6. **Document all configuration changes**

---

## 📚 Additional Resources

- [PayHere Integration Guide](https://support.payhere.lk/api-&-mobile-sdk/payhere-checkout)
- [PayHere API Documentation](https://support.payhere.lk/api-&-mobile-sdk)
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [Security Best Practices](./SECURITY_AUDIT.md)

---

**Last Updated**: January 31, 2026
**Status**: Ready for Production ✅
