ALTER TABLE public."Cart"
ADD COLUMN "sessionId" TEXT;

CREATE UNIQUE INDEX "idx_cart_session_id" ON public."Cart"("sessionId");
