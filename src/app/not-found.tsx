import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-8">
      <h1 className="text-2xl font-extrabold text-pine">That page is not here</h1>
      <p className="mt-2 text-base text-muted">Go back to the home screen and pick a section from the menu.</p>
      <div className="mt-4">
        <ButtonLink href="/">Back to home</ButtonLink>
      </div>
    </div>
  );
}
