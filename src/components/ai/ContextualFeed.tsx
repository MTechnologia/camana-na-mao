import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useNoticias } from "@/hooks/useNoticias";
import { useUpcomingAgenda } from "@/hooks/useAgenda";
import { isToday, isTomorrow, differenceInHours, differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/dateUtils";

interface FeedItem {
  id: string;
  type: "news" | "audiencia";
  title: string;
  description: string;
  date: string;
  time?: string;
  badge?: string;
  badgeColor?: string;
  link?: string;
}

const ContextualFeed = () => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Use hooks to get news and agenda from API
  const { data: noticiasData = [], isLoading: noticiasLoading } = useNoticias();
  const { data: agendaData = [], isLoading: agendaLoading } = useUpcomingAgenda(3);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      containScroll: "keepSnaps",
      dragFree: false,
      skipSnaps: false,
    },
    [
      Autoplay({
        delay: 5000,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
        playOnInit: true,
      }),
    ],
  );

  // Update selected index on scroll
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Set ready state and restart autoplay after user interaction
  useEffect(() => {
    if (!emblaApi) return;

    // Mark as ready when carousel is initialized
    setIsReady(true);

    emblaApi.on("select", onSelect);
    emblaApi.on("pointerUp", () => {
      const autoplay = emblaApi.plugins().autoplay;
      if (autoplay) {
        setTimeout(() => {
          autoplay.play();
        }, 3000); // Resume after 3 seconds
      }
    });

    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Get multiple recent news (up to 3)
  const recentNews = noticiasData.slice(0, 3);

  // Check if news is recent (within 6 hours)
  const isRecentNews = (date: string) => {
    try {
      const hoursAgo = differenceInHours(new Date(), new Date(date));
      return hoursAgo <= 6;
    } catch {
      return false;
    }
  };

  // Check if event is soon (within 3 days)
  const isEventSoon = (dateStr: string) => {
    try {
      const daysUntil = differenceInDays(new Date(dateStr), new Date());
      return daysUntil >= 0 && daysUntil <= 3;
    } catch {
      return false;
    }
  };

  const formatNewsTime = (date: string) => {
    try {
      return formatRelativeTime(date);
    } catch {
      return "";
    }
  };

  const formatEventDate = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isToday(date)) {
        return `Hoje às ${timeStr.slice(0, 5)}`;
      }
      if (isTomorrow(date)) {
        return `Amanhã às ${timeStr.slice(0, 5)}`;
      }
      return `${format(date, "d 'de' MMMM", { locale: ptBR })} às ${timeStr.slice(0, 5)}`;
    } catch {
      return "";
    }
  };

  // Build feed items from API data
  const feedItems: FeedItem[] = [
    ...recentNews.map((news) => ({
      id: news.id,
      type: "news" as const,
      title: news.title,
      description: news.description,
      date: news.pubDate,
      badge: isRecentNews(news.pubDate) ? "Novo" : undefined,
      badgeColor: "destructive",
    })),
    ...agendaData.map((item) => ({
      id: item.id,
      type: "audiencia" as const,
      title: item.title,
      description:
        item.description ||
        `Evento sobre ${item.eventType}. Participe e contribua com sua opinião.`,
      date: item.eventDate,
      time: item.eventTime || "00:00",
      badge: isEventSoon(item.eventDate) ? "Em breve" : undefined,
      badgeColor: "amber",
      link: item.link,
    })),
  ];

  // Show nothing while loading or if no items
  if ((noticiasLoading && agendaLoading) || feedItems.length === 0) return null;

  const scrollTo = (index: number) => {
    emblaApi?.scrollTo(index);
  };

  const handleItemClick = (item: FeedItem) => {
    if (item.type === "news") {
      navigate(`/institucional/noticias/${item.id}`);
    } else if (item.link) {
      // Open external link for events
      window.open(item.link, "_blank");
    } else {
      // Fallback to agenda page
      navigate("/institucional/agenda");
    }
  };

  return (
    <motion.div
      className="w-full mt-4 mb-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isReady ? 1 : 0, y: isReady ? 0 : 20 }}
      transition={{ duration: 0.4 }}
    >
      {/* Section Title */}
      <div className="mb-3 px-4">
        <span className="text-sm font-semibold text-foreground">Destaques</span>
      </div>

      {/* Carousel Container - overflow-x-clip allows shadows to show vertically */}
      <div className="overflow-x-clip overflow-y-visible px-4" ref={emblaRef}>
        <div className="flex gap-4 pr-4">
          {feedItems.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => handleItemClick(item)}
              className="group flex-shrink-0 w-[80%] min-w-[240px] max-w-[300px] text-left"
              aria-label={item.title}
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-secondary/5 border border-border/60 shadow-sm hover:shadow-lg hover:border-primary/20 backdrop-blur-sm p-4 h-full min-h-[140px] transition-all duration-300">
                {/* Decorative gradient orb */}
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-primary/15 to-transparent rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-80" />

                {/* Header */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {/* Type Chip */}
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                      item.type === "news"
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {item.type === "news" ? "Notícia" : "Evento"}
                  </span>

                  {/* Status Badge */}
                  {item.badge && (
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                        item.badgeColor === "destructive"
                          ? "bg-destructive/15 text-destructive animate-pulse"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Date/Time */}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {item.type === "news"
                      ? formatNewsTime(item.date)
                      : formatEventDate(item.date, item.time || "00:00")}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-1.5 group-hover:text-primary transition-colors duration-200">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Dots */}
      {feedItems.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {feedItems.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollTo(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                selectedIndex === idx
                  ? "bg-primary w-4"
                  : "bg-muted-foreground/30 w-1.5 hover:bg-muted-foreground/50",
              )}
              aria-label={`Ir para slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ContextualFeed;
