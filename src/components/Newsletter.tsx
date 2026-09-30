import FooterBanner from "@/components/FooterBanner";

interface NewsletterProps {
  resellerId?: string;
}

const Newsletter = ({ resellerId }: NewsletterProps) => {
  return <FooterBanner resellerId={resellerId} />;
};

export default Newsletter;