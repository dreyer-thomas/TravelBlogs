This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Localization

All user-facing UI text must be translatable and shipped in both English and German. Use the translation utilities and add keys for both locales whenever new UI copy is introduced.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## HTTPS (Production)

TravelBlogs runs over HTTPS in production using a custom Node HTTPS entrypoint.

1. Obtain certificates from a free provider like Lets Encrypt.
2. Place the files on your NAS, for example:
   - `/volume1/certs/travelblogs/fullchain.pem`
   - `/volume1/certs/travelblogs/privkey.pem`
3. Set the env vars in `.env`:
   - `TLS_CERT_PATH=/volume1/certs/travelblogs/fullchain.pem`
   - `TLS_KEY_PATH=/volume1/certs/travelblogs/privkey.pem`
   - `TLS_CA_PATH=/volume1/certs/travelblogs/chain.pem` (optional)
4. Build and run the HTTPS server:
   - `npm run build`
   - `npm run start` (alias: `npm run start:https`)

Lets Encrypt certificates expire every 90 days. Plan regular renewals and update the files in place so the server can be restarted with fresh certs.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
