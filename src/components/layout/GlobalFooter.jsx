import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function GlobalFooter() {
  const productLinks = [
    { name: '功能特性', href: '#' },
    { name: '集成服务', href: '#' },
    { name: '定价方案', href: '#' },
    { name: '更新日志', href: '#' },
  ];

  const companyLinks = [
    { name: '关于我们', href: '#' },
    { name: '加入我们', href: '#' },
    { name: '博客', href: '#' },
    { name: '联系我们', href: '#' },
  ];

  return (
    <footer
      className="w-full mt-auto"
      style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-primary)',
      }}
    >
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--bg-primary)',
                }}
              >
                G
              </div>
              <span
                className="text-lg font-bold tracking-wide"
                style={{ color: 'var(--text-primary)' }}
              >
                GRAYLUMA AI
              </span>
            </div>
            <p
              className="text-sm leading-relaxed max-w-xs mb-6"
              style={{ color: 'var(--text-tertiary)' }}
            >
              让每个人都能轻松驾驭人工智能的全部潜力，无需复杂操作。
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="transition-colors hover:opacity-80"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="#"
                className="transition-colors hover:opacity-80"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href="#"
                className="transition-colors hover:opacity-80"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div className="md:col-span-3 md:col-start-7">
            <h4
              className="text-sm font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              产品
            </h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors hover:opacity-80"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="md:col-span-3">
            <h4
              className="text-sm font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              公司
            </h4>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors hover:opacity-80"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className="border-t"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p
            className="text-xs"
            style={{ color: 'var(--text-disabled)' }}
          >
            © 2025 GRAYLUMA AI Inc. 保留所有权利。
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: 'var(--text-tertiary)' }}
            >
              隐私政策
            </a>
            <a
              href="#"
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: 'var(--text-tertiary)' }}
            >
              服务条款
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}