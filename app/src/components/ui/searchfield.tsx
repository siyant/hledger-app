import { SearchIcon, XIcon } from "lucide-react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  Group as AriaGroup,
  type GroupProps as AriaGroupProps,
  Input as AriaInput,
  type InputProps as AriaInputProps,
  SearchField as AriaSearchField,
  type SearchFieldProps as AriaSearchFieldProps,
  type ValidationResult as AriaValidationResult,
  Text,
  composeRenderProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

import { FieldError, FieldGroup, Label } from "./field";

function SearchField({ className, ...props }: AriaSearchFieldProps) {
  return (
    <AriaSearchField className={composeRenderProps(className, (className) => cn("group", className))} {...props} />
  );
}

function SearchFieldInput({ className, ...props }: AriaInputProps) {
  return (
    <AriaInput
      className={composeRenderProps(className, (className) =>
        cn(
          "min-w-0 flex-1 bg-background px-2 py-1.5 outline outline-0 placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden",
          className,
        ),
      )}
      {...props}
    />
  );
}

function SearchFieldGroup({ className, ...props }: AriaGroupProps) {
  return (
    <AriaGroup
      className={composeRenderProps(className, (className) =>
        cn(
          "flex h-10 w-full items-center overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          /* Focus Within */
          "data-[focus-within]:outline-none data-[focus-within]:ring-2 data-[focus-within]:ring-ring data-[focus-within]:ring-offset-2",
          /* Disabled */
          "data-[disabled]:opacity-50",
          className,
        ),
      )}
      {...props}
    />
  );
}

function SearchFieldClear({ className, ...props }: AriaButtonProps) {
  return (
    <AriaButton
      className={composeRenderProps(className, (className) =>
        cn(
          "mr-1 rounded-sm opacity-70 ring-offset-background transition-opacity",
          /* Hover */
          "data-[hovered]:opacity-100",
          /* Disabled */
          "data-[disabled]:pointer-events-none",
          /* Empty */
          "group-data-[empty]:invisible",
          className,
        ),
      )}
      {...props}
    />
  );
}

interface JollySearchFieldProps extends AriaSearchFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: AriaValidationResult) => string);
}

function JollySearchField({ label, description, className, errorMessage, ...props }: JollySearchFieldProps) {
  return (
    <SearchField
      className={composeRenderProps(className, (className) => cn("group flex flex-col gap-2", className))}
      {...props}
    >
      {label !== undefined && <Label>{label}</Label>}
      <FieldGroup>
        <SearchIcon aria-hidden className="size-4 text-muted-foreground" />
        <SearchFieldInput placeholder="Search..." />
        <SearchFieldClear>
          <XIcon aria-hidden className="size-4 cursor-pointer" />
        </SearchFieldClear>
      </FieldGroup>
      {description && (
        <Text className="text-sm text-muted-foreground" slot="description">
          {description}
        </Text>
      )}
      <FieldError>{errorMessage}</FieldError>
    </SearchField>
  );
}

export { JollySearchField, SearchField, SearchFieldClear, SearchFieldGroup, SearchFieldInput };
export type { JollySearchFieldProps };
