import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from "react";

const AssistantRuntimeContext = createContext(null);

const hiddenComparisonLabels = new Set([
  "image_url",
  "images",
  "url",
  "refid",
  "group_id",
  "productcategories",
  "stocklevel"
]);

function normalizeMessage(event) {
  if (!event) return null;

  const text =
    typeof event.message === "string"
      ? event.message
      : event.message?.message ||
        event.message?.text ||
        event.text;

  if (!text || typeof text !== "string") {
    return null;
  }

  const source = String(
    event.source || "ai"
  ).toLowerCase();

  return {
    role:
      source === "user"
        ? "user"
        : "assistant",
    text: text.trim()
  };
}

function plainText(value, fallback = "") {
  const text = String(value ?? fallback)
    .replace(/\*+/g, "")
    .trim();

  return text || fallback;
}

function normalizeClientCard(payload = {}) {
  return {
    id:
      plainText(payload.product_id) ||
      `client-${crypto.randomUUID()}`,

    title: plainText(
      payload.title,
      "Producto Easy"
    ),

    brand: null,

    imageUrl: plainText(
      payload.image_url,
      "/product-placeholder.svg"
    ),

    displayPrice: plainText(
      payload.price,
      "Consultar"
    ),

    sellingPrice: null,
    listPrice: null,

    url:
      plainText(payload.url) ||
      null,

    stock: null,

    attributes: {},

    source:
      "elevenlabs-client-tool"
  };
}

function normalizeComparisonProducts(products) {
  if (!Array.isArray(products)) {
    return [];
  }

  return products
    .slice(0, 3)
    .map((product, index) => {
      const attributes =
        Array.isArray(
          product?.attributes
        )
          ? product.attributes
              .map((attribute) => ({
                label: plainText(
                  attribute?.label
                ),
                value: plainText(
                  attribute?.value,
                  "—"
                )
              }))
              .filter(
                (attribute) =>
                  attribute.label &&
                  !hiddenComparisonLabels.has(
                    attribute.label.toLowerCase()
                  )
              )
          : [];

      return {
        id: `comparison-${index}`,

        name: plainText(
          product?.name,
          `Producto ${index + 1}`
        ),

        attributes
      };
    });
}

export function AssistantRuntimeProvider({
  children
}) {
  const [messages, setMessages] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [
    presentation,
    setPresentation
  ] = useState("cards");

  const [lastError, setLastError] =
    useState(null);

  const [
    connectedAt,
    setConnectedAt
  ] = useState(null);

  /*
   * Indica que la próxima ejecución
   * de display_product_card debe
   * comenzar un conjunto nuevo de cards.
   *
   * Importante:
   * NO borramos las cards cuando el usuario
   * habla. Las mantenemos hasta que realmente
   * llegue una nueva visualización.
   */
  const pendingCardResetRef =
    useRef(true);

  /*
   * Ref para conocer inmediatamente cuál
   * es la visualización activa sin depender
   * del ciclo async de React.
   */
  const presentationRef =
    useRef("cards");

  const appendMessage = useCallback(
    (next) => {
      setMessages((previous) => {
        if (!next?.text) {
          return previous;
        }

        const last =
          previous.at(-1);

        if (
          last?.role === next.role
        ) {
          if (
            last.text === next.text
          ) {
            return previous;
          }

          if (
            next.text.startsWith(
              last.text
            ) ||
            last.text.startsWith(
              next.text
            )
          ) {
            return [
              ...previous.slice(
                0,
                -1
              ),
              {
                ...last,
                text: next.text
              }
            ];
          }
        }

        return [
          ...previous,
          {
            ...next,
            id:
              crypto.randomUUID()
          }
        ];
      });
    },
    []
  );

  const onMessage = useCallback(
    (event) => {
      const normalized =
        normalizeMessage(event);

      if (!normalized) {
        return;
      }

      /*
       * Una nueva intervención del usuario
       * prepara el siguiente conjunto de
       * product cards.
       *
       * No las borramos todavía.
       */
      if (
        normalized.role === "user"
      ) {
        pendingCardResetRef.current =
          true;
      }

      appendMessage(normalized);
    },
    [appendMessage]
  );

  const onConnect = useCallback(
    () => {
      setConnectedAt(new Date());
      setLastError(null);

      pendingCardResetRef.current =
        true;
    },
    []
  );

  const onDisconnect =
    useCallback(() => {
      setConnectedAt(null);
    }, []);

  const onError = useCallback(
    (error) => {
      console.error(
        "ElevenLabs error",
        error
      );

      setLastError(
        error?.message ||
          String(error)
      );
    },
    []
  );

  const fetchProducts =
    useCallback(async (ids) => {
      const list =
        Array.isArray(ids)
          ? ids.filter(Boolean)
          : [];

      if (!list.length) {
        return [];
      }

      const response =
        await fetch(
          `/api/catalog/products?ids=${encodeURIComponent(
            list.join(",")
          )}`
        );

      if (!response.ok) {
        throw new Error(
          "No se pudieron resolver los productos para el widget"
        );
      }

      const payload =
        await response.json();

      return (
        payload.products || []
      );
    }, []);

  /*
   * Legacy client tool.
   *
   * Esta tool ya recibe todos los productos
   * juntos, por lo que reemplaza directamente
   * la visualización anterior.
   */
  const showProducts = useCallback(
    async ({
      product_ids:
        productIds = []
    } = {}) => {
      const resolved =
        await fetchProducts(
          productIds
        );

      setProducts(resolved);

      presentationRef.current =
        "cards";

      pendingCardResetRef.current =
        false;

      setPresentation("cards");

      return `Mostrando ${resolved.length} productos`;
    },
    [fetchProducts]
  );

  /*
   * Legacy comparison tool.
   */
  const showComparison =
    useCallback(
      async ({
        product_ids:
          productIds = []
      } = {}) => {
        const resolved =
          await fetchProducts(
            productIds
          );

        setProducts(
          resolved.slice(0, 3)
        );

        presentationRef.current =
          "comparison";

        pendingCardResetRef.current =
          false;

        setPresentation(
          "comparison"
        );

        return `Comparando ${resolved.length} productos`;
      },
      [fetchProducts]
    );

  /*
   * ElevenLabs puede ejecutar esta tool
   * varias veces consecutivas:
   *
   * card A
   * card B
   * card C
   *
   * La primera card de una nueva consulta
   * reemplaza el conjunto anterior.
   *
   * Las siguientes se agregan al mismo batch.
   */
  const displayProductCard =
    useCallback(
      async (payload = {}) => {
        console.info(
          "[ClientTool] display_product_card",
          payload
        );

        const next =
          normalizeClientCard(
            payload
          );

        const shouldStartNewBatch =
          pendingCardResetRef.current ||
          presentationRef.current !==
            "cards";

        setProducts(
          (previous) => {
            /*
             * Primera card de una
             * nueva consulta.
             */
            if (
              shouldStartNewBatch
            ) {
              return [next];
            }

            /*
             * Misma consulta:
             * acumulamos cards.
             */
            const withoutDuplicate =
              previous.filter(
                (product) =>
                  product.id !==
                  next.id
              );

            return [
              ...withoutDuplicate,
              next
            ].slice(-6);
          }
        );

        /*
         * Las próximas llamadas pertenecen
         * al mismo conjunto hasta que haya
         * una nueva intervención del usuario.
         */
        pendingCardResetRef.current =
          false;

        presentationRef.current =
          "cards";

        setPresentation("cards");
        setLastError(null);
      },
      []
    );

  /*
   * Una comparación siempre representa
   * una visualización completa, por lo que
   * reemplaza lo que hubiera antes.
   */
  const displayComparisonTable =
    useCallback(
      async ({
        products:
          comparisonProducts = []
      } = {}) => {
        console.info(
          "[ClientTool] display_comparison_table",
          comparisonProducts
        );

        const normalized =
          normalizeComparisonProducts(
            comparisonProducts
          );

        /*
         * Reemplaza cards o tabla
         * anteriores.
         */
        setProducts(normalized);

        presentationRef.current =
          "comparison";

        pendingCardResetRef.current =
          false;

        setPresentation(
          "comparison"
        );

        setLastError(null);
      },
      []
    );

  const value = useMemo(
    () => ({
      messages,
      products,
      presentation,
      lastError,
      connectedAt,

      onMessage,
      onConnect,
      onDisconnect,
      onError,

      showProducts,
      showComparison,

      displayProductCard,
      displayComparisonTable,

      appendMessage
    }),
    [
      messages,
      products,
      presentation,
      lastError,
      connectedAt,
      onMessage,
      onConnect,
      onDisconnect,
      onError,
      showProducts,
      showComparison,
      displayProductCard,
      displayComparisonTable,
      appendMessage
    ]
  );

  return (
    <AssistantRuntimeContext.Provider
      value={value}
    >
      {children}
    </AssistantRuntimeContext.Provider>
  );
}

export function useAssistantRuntime() {
  const value = useContext(
    AssistantRuntimeContext
  );

  if (!value) {
    throw new Error(
      "useAssistantRuntime must be used inside AssistantRuntimeProvider"
    );
  }

  return value;
}